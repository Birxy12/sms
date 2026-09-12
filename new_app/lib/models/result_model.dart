class SubjectScore {
  final String subjectName;
  final double caScore;
  final double examScore;
  final double totalScore;
  final String grade;
  final String remark;

  const SubjectScore({
    required this.subjectName,
    required this.caScore,
    required this.examScore,
    required this.totalScore,
    required this.grade,
    required this.remark,
  });

  factory SubjectScore.fromJson(String subjectName, Map<String, dynamic> json) {
    // Compressed keys: c1, c2, ex, to, gr, rm
    final c1 = (json['cat1'] ?? json['c1'] ?? 0).toDouble();
    final c2 = (json['cat2'] ?? json['c2'] ?? 0).toDouble();
    final ca = c1 + c2;
    final exam = (json['exam'] ?? json['ex'] ?? 0).toDouble();
    final total = (json['total'] ?? json['to'] ?? (ca + exam)).toDouble();
    final grade = (json['grade'] ?? json['gr'] ?? _calculateGrade(total)).toString();
    final remark = (json['remarks'] ?? json['rm'] ?? _calculateRemark(grade)).toString();

    return SubjectScore(
      subjectName: subjectName,
      caScore: ca,
      examScore: exam,
      totalScore: total,
      grade: grade,
      remark: remark,
    );
  }

  static String _calculateGrade(double score) {
    if (score >= 75) return 'A1';
    if (score >= 70) return 'B2';
    if (score >= 65) return 'B3';
    if (score >= 60) return 'C4';
    if (score >= 55) return 'C5';
    if (score >= 50) return 'C6';
    if (score >= 45) return 'D7';
    if (score >= 40) return 'E8';
    return 'F9';
  }

  static String _calculateRemark(String grade) {
    switch (grade.toUpperCase()) {
      case 'A1':
        return 'Excellent';
      case 'B2':
      case 'B3':
        return 'Very Good';
      case 'C4':
      case 'C5':
      case 'C6':
        return 'Credit';
      case 'D7':
      case 'E8':
        return 'Pass';
      default:
        return 'Fail';
    }
  }
}

class StudentResultModel {
  final String studentId;
  final String studentName;
  final String regNumber;
  final String className;
  final String term;
  final String session;
  final List<SubjectScore> scores;
  final double averageScore;
  final int position;

  StudentResultModel({
    required this.studentId,
    required this.studentName,
    required this.regNumber,
    required this.className,
    required this.term,
    required this.session,
    required this.scores,
    required this.averageScore,
    required this.position,
  });

  factory StudentResultModel.fromJson(Map<String, dynamic> json) {
    final regNo = (json['regNo'] ?? json['r'] ?? '').toString();
    final name = (json['studentName'] ?? json['n'] ?? 'Student').toString();
    final className = (json['className'] ?? json['c'] ?? '').toString();
    final term = (json['term'] ?? json['t'] ?? '1st Term').toString();
    final session = (json['session'] ?? json['s'] ?? '2025/2026').toString();

    final List<SubjectScore> subjectScores = [];
    double sumTotals = 0;
    int position = 1;
    double average = 0;

    final marksRaw = json['marks'] ?? json['m'];
    if (marksRaw is Map) {
      marksRaw.forEach((key, val) {
        if (key == '_meta' && val is Map) {
          position = (val['position'] ?? val['ps'] ?? 1).toInt();
          average = (val['average'] ?? val['avg'] ?? 0).toDouble();
        } else if (val is Map) {
          final subjScore = SubjectScore.fromJson(key.toString(), Map<String, dynamic>.from(val));
          subjectScores.add(subjScore);
          sumTotals += subjScore.totalScore;
        }
      });
    }

    if (average == 0 && subjectScores.isNotEmpty) {
      average = double.parse((sumTotals / subjectScores.length).toStringAsFixed(1));
    }

    return StudentResultModel(
      studentId: json['id'] ?? regNo,
      studentName: name,
      regNumber: regNo,
      className: className,
      term: term,
      session: session,
      scores: subjectScores,
      averageScore: average,
      position: position,
    );
  }
}
