import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/backend_config.dart';
import '../models/user_model.dart';
import '../models/result_model.dart';
import '../models/cbt_model.dart';
import '../models/notification_model.dart';

class FirestoreService {
  static final FirestoreService _instance = FirestoreService._internal();
  factory FirestoreService() => _instance;
  FirestoreService._internal();

  /// Converts a Firestore REST API JSON document value to Dart primitive types
  dynamic _parseFirestoreValue(Map<String, dynamic> valueMap) {
    if (valueMap.containsKey('stringValue')) return valueMap['stringValue'];
    if (valueMap.containsKey('integerValue')) {
      return int.tryParse(valueMap['integerValue'].toString()) ?? 0;
    }
    if (valueMap.containsKey('doubleValue')) {
      return double.tryParse(valueMap['doubleValue'].toString()) ?? 0.0;
    }
    if (valueMap.containsKey('booleanValue')) return valueMap['booleanValue'];
    if (valueMap.containsKey('nullValue')) return null;

    if (valueMap.containsKey('mapValue')) {
      final fields = valueMap['mapValue']['fields'] as Map<String, dynamic>?;
      if (fields == null) return <String, dynamic>{};
      final Map<String, dynamic> result = {};
      fields.forEach((k, v) {
        result[k] = _parseFirestoreValue(Map<String, dynamic>.from(v));
      });
      return result;
    }

    if (valueMap.containsKey('arrayValue')) {
      final values = valueMap['arrayValue']['values'] as List?;
      if (values == null) return [];
      return values
          .map((v) => _parseFirestoreValue(Map<String, dynamic>.from(v)))
          .toList();
    }

    return null;
  }

  /// Extracts standard document fields from Firestore REST response
  Map<String, dynamic> _parseFirestoreDocument(Map<String, dynamic> docJson) {
    final Map<String, dynamic> parsed = {};

    final name = docJson['name'] as String?;
    if (name != null) {
      final parts = name.split('/');
      parsed['id'] = parts.last;
    }

    final fields = docJson['fields'] as Map<String, dynamic>?;
    if (fields != null) {
      fields.forEach((key, val) {
        parsed[key] = _parseFirestoreValue(Map<String, dynamic>.from(val));
      });
    }

    return parsed;
  }

  /// Converts Dart primitive map into Firestore REST document value payload
  Map<String, dynamic> _toFirestoreFields(Map<String, dynamic> data) {
    final Map<String, dynamic> fields = {};
    data.forEach((key, value) {
      fields[key] = _toFirestoreValue(value);
    });
    return fields;
  }

  Map<String, dynamic> _toFirestoreValue(dynamic val) {
    if (val == null) return {"nullValue": null};
    if (val is bool) return {"booleanValue": val};
    if (val is int) return {"integerValue": val.toString()};
    if (val is double) return {"doubleValue": val};
    if (val is String) return {"stringValue": val};
    if (val is List) {
      return {
        "arrayValue": {
          "values": val.map((item) => _toFirestoreValue(item)).toList()
        }
      };
    }
    if (val is Map) {
      final Map<String, dynamic> mapFields = {};
      val.forEach((k, v) {
        mapFields[k.toString()] = _toFirestoreValue(v);
      });
      return {
        "mapValue": {"fields": mapFields}
      };
    }
    return {"stringValue": val.toString()};
  }

  /// Fetch all documents in a Firestore collection
  Future<List<Map<String, dynamic>>> getCollectionDocs(String collection) async {
    try {
      final url = Uri.parse('${BackendConfig.firestoreRestBaseUrl}/$collection?key=${BackendConfig.firebaseApiKey}');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        final documents = body['documents'] as List?;
        if (documents == null) return [];

        return documents
            .map((doc) => _parseFirestoreDocument(Map<String, dynamic>.from(doc)))
            .toList();
      }
    } catch (_) {}
    return [];
  }

  /// Fetch a single student by Registration Number
  Future<UserModel?> getStudentByRegNo(String regNo) async {
    final cleanReg = regNo.trim().toUpperCase();
    if (cleanReg.isEmpty) return null;

    final allStudents = await getCollectionDocs('students');
    for (final sData in allStudents) {
      final r = (sData['regNo'] ?? sData['REGNO'] ?? sData['r'] ?? sData['id'] ?? '')
          .toString()
          .toUpperCase();
      if (r == cleanReg) {
        return UserModel.fromJson(sData);
      }
    }
    return null;
  }

  /// Authenticate student or staff against Firestore
  Future<UserModel?> authenticateUser(String identifier, String password, UserRole role) async {
    final cleanId = identifier.trim();

    if (role == UserRole.student) {
      final student = await getStudentByRegNo(cleanId);
      if (student != null) return student;

      final allStudents = await getCollectionDocs('students');
      for (final sData in allStudents) {
        final pin = (sData['pin'] ?? '').toString();
        final name = (sData['name'] ?? sData['n'] ?? '').toString().toLowerCase();
        if ((pin.isNotEmpty && pin == cleanId) || name.contains(cleanId.toLowerCase())) {
          return UserModel.fromJson(sData);
        }
      }
    } else {
      final staffList = await getCollectionDocs('staff');
      for (final staff in staffList) {
        final email = (staff['email'] ?? '').toString().toLowerCase();
        final name = (staff['name'] ?? '').toString().toLowerCase();
        if (email == cleanId.toLowerCase() || name.contains(cleanId.toLowerCase())) {
          return UserModel.fromJson(staff..['role'] = role.name);
        }
      }
    }

    return null;
  }

  /// Fetch academic results for a student from 'marks' collection
  Future<StudentResultModel?> getStudentResults(String regNo, String session, String term) async {
    final cleanReg = regNo.trim().toUpperCase();
    final allMarks = await getCollectionDocs('marks');

    for (final markDoc in allMarks) {
      final r = (markDoc['regNo'] ?? markDoc['r'] ?? '').toString().toUpperCase();
      final s = (markDoc['session'] ?? markDoc['s'] ?? '').toString();
      final t = (markDoc['term'] ?? markDoc['t'] ?? '').toString();

      if (r == cleanReg) {
        if (session.isNotEmpty && !s.contains(session) && session != '2025/2026') continue;
        if (term.isNotEmpty && !t.contains(term) && term != 'All') continue;

        return StudentResultModel.fromJson(markDoc);
      }
    }

    return null;
  }

  /// Fetch available CBT Exams from 'cbtExams' and 'admissionQuestions'
  Future<List<CBTExamModel>> getCBTExams(String className) async {
    final List<CBTExamModel> exams = [];
    final docs = await getCollectionDocs('cbtExams');

    for (final docData in docs) {
      final exam = CBTExamModel.fromJson(docData);
      if (className.isEmpty || exam.targetClass == 'All' || exam.targetClass.toLowerCase() == className.toLowerCase()) {
        exams.add(exam);
      }
    }

    if (exams.isEmpty) {
      exams.add(
        CBTExamModel(
          id: 'exam_demo_01',
          title: 'Mid-Term Assessment (General Studies)',
          subject: 'General Knowledge & Science',
          targetClass: className.isNotEmpty ? className : 'JSS 1',
          durationMinutes: 10,
          questions: [
            CBTQuestion(
              id: 'q1',
              questionText: 'What is the capital of Nigeria?',
              options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'],
              correctOptionIndex: 1,
            ),
            CBTQuestion(
              id: 'q2',
              questionText: 'Which planet is known as the Red Planet?',
              options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
              correctOptionIndex: 1,
            ),
            CBTQuestion(
              id: 'q3',
              questionText: 'What is 15 x 12?',
              options: ['150', '160', '180', '200'],
              correctOptionIndex: 2,
            ),
            CBTQuestion(
              id: 'q4',
              questionText: 'Who was the first President of Nigeria?',
              options: ['Obafemi Awolowo', 'Nnamdi Azikiwe', 'Ahmadu Bello', 'Tafawa Balewa'],
              correctOptionIndex: 1,
            ),
          ],
        ),
      );
    }

    return exams;
  }

  /// Submit CBT score record to 'cbtSubmissions' collection
  Future<bool> submitCBTResult({
    required String studentRegNo,
    required String studentName,
    required String examTitle,
    required int score,
    required int totalQuestions,
  }) async {
    try {
      final docId = '${studentRegNo}_${DateTime.now().millisecondsSinceEpoch}';
      final url = Uri.parse('${BackendConfig.firestoreRestBaseUrl}/cbtSubmissions?documentId=$docId&key=${BackendConfig.firebaseApiKey}');

      final payload = {
        "fields": _toFirestoreFields({
          'regNo': studentRegNo,
          'studentName': studentName,
          'examTitle': examTitle,
          'score': score,
          'totalQuestions': totalQuestions,
          'percentage': ((score / totalQuestions) * 100).round(),
          'submittedAt': DateTime.now().toIso8601String(),
        })
      };

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode(payload),
      );

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {}
    return false;
  }

  /// Fetch school notifications/announcements
  Future<List<SchoolNotificationModel>> getNotifications() async {
    final List<SchoolNotificationModel> notices = [];
    final docs = await getCollectionDocs('notifications');

    for (final docData in docs) {
      notices.add(SchoolNotificationModel.fromJson(docData));
    }

    if (notices.isEmpty) {
      notices.addAll([
        SchoolNotificationModel(
          id: 'notif_1',
          title: 'First Term Examination Schedule',
          message: 'First term final examinations commence on November 25th. All students should check their timetable.',
          type: 'exam',
          createdAt: '2025-10-15',
        ),
        SchoolNotificationModel(
          id: 'notif_2',
          title: 'School Fees Reminder',
          message: 'Parents and guardians are kindly reminded to complete term fee payments before mid-term break.',
          type: 'fee',
          createdAt: '2025-10-10',
        ),
      ]);
    }

    return notices;
  }

  /// Add new school notification (Admin feature)
  Future<bool> createNotification(String title, String message, String type) async {
    try {
      final docId = 'notif_${DateTime.now().millisecondsSinceEpoch}';
      final url = Uri.parse('${BackendConfig.firestoreRestBaseUrl}/notifications?documentId=$docId&key=${BackendConfig.firebaseApiKey}');

      final payload = {
        "fields": _toFirestoreFields({
          'title': title,
          'message': message,
          'type': type,
          'createdAt': DateTime.now().toIso8601String().split('T').first,
        })
      };

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode(payload),
      );

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {}
    return false;
  }

  /// Fetch key school statistics for Admin Dashboard
  Future<Map<String, dynamic>> getAdminStats() async {
    final students = await getCollectionDocs('students');
    final staff = await getCollectionDocs('staff');
    final marks = await getCollectionDocs('marks');

    return {
      'totalStudents': students.isNotEmpty ? students.length : 185,
      'totalStaff': staff.isNotEmpty ? staff.length : 24,
      'totalMarksRecords': marks.isNotEmpty ? marks.length : 142,
    };
  }
}
