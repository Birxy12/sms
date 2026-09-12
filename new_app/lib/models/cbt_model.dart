class CBTQuestion {
  final String id;
  final String questionText;
  final List<String> options;
  final int correctOptionIndex;
  final String? imageUrl;

  CBTQuestion({
    required this.id,
    required this.questionText,
    required this.options,
    required this.correctOptionIndex,
    this.imageUrl,
  });

  factory CBTQuestion.fromJson(Map<String, dynamic> json) {
    List<String> parsedOptions = [];
    if (json['options'] is List) {
      parsedOptions = (json['options'] as List).map((e) => e.toString()).toList();
    } else if (json['options'] is Map) {
      final map = json['options'] as Map;
      parsedOptions = ['A', 'B', 'C', 'D'].map((opt) => map[opt]?.toString() ?? '').toList();
    }

    int correctIdx = 0;
    if (json['correctIndex'] is int) {
      correctIdx = json['correctIndex'];
    } else if (json['correctAnswer'] is String) {
      final ans = (json['correctAnswer'] as String).trim().toUpperCase();
      if (ans == 'A') {
        correctIdx = 0;
      } else if (ans == 'B') {
        correctIdx = 1;
      } else if (ans == 'C') {
        correctIdx = 2;
      } else if (ans == 'D') {
        correctIdx = 3;
      }
    }

    return CBTQuestion(
      id: json['id'] ?? json['qId'] ?? '',
      questionText: (json['question'] ?? json['questionText'] ?? '').toString(),
      options: parsedOptions.isNotEmpty ? parsedOptions : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOptionIndex: correctIdx,
      imageUrl: json['imageUrl']?.toString(),
    );
  }
}

class CBTExamModel {
  final String id;
  final String title;
  final String subject;
  final String targetClass;
  final int durationMinutes;
  final List<CBTQuestion> questions;

  CBTExamModel({
    required this.id,
    required this.title,
    required this.subject,
    required this.targetClass,
    required this.durationMinutes,
    required this.questions,
  });

  factory CBTExamModel.fromJson(Map<String, dynamic> json) {
    List<CBTQuestion> qList = [];
    if (json['questions'] is List) {
      qList = (json['questions'] as List)
          .map((item) => CBTQuestion.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    }

    return CBTExamModel(
      id: json['id'] ?? '',
      title: (json['title'] ?? json['subject'] ?? 'CBT Test').toString(),
      subject: (json['subject'] ?? 'General Studies').toString(),
      targetClass: (json['class'] ?? json['targetClass'] ?? 'All').toString(),
      durationMinutes: (json['duration'] ?? json['durationMinutes'] ?? 15).toInt(),
      questions: qList,
    );
  }
}
