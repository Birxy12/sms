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

  factory SubjectScore.fromJson(Map<String, dynamic> json) {
    return SubjectScore(
      subjectName: json['subject'] ?? json['subjectName'] ?? '',
      caScore: (json['caScore'] ?? json['ca'] ?? 0).toDouble(),
      examScore: (json['examScore'] ?? json['exam'] ?? 0).toDouble(),
      totalScore: (json['totalScore'] ?? json['total'] ?? 0).toDouble(),
      grade: json['grade'] ?? 'N/A',
      remark: json['remark'] ?? 'Good',
    );
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
}
