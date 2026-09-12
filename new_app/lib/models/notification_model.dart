class SchoolNotificationModel {
  final String id;
  final String title;
  final String message;
  final String type;
  final String createdAt;

  SchoolNotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.createdAt,
  });

  factory SchoolNotificationModel.fromJson(Map<String, dynamic> json) {
    return SchoolNotificationModel(
      id: json['id'] ?? '',
      title: (json['title'] ?? 'Notice').toString(),
      message: (json['message'] ?? json['body'] ?? '').toString(),
      type: (json['type'] ?? json['category'] ?? 'general').toString(),
      createdAt: (json['createdAt'] ?? json['timestamp'] ?? '').toString(),
    );
  }
}
