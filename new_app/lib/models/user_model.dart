enum UserRole { student, teacher, admin, principal, bursar }

class UserModel {
  final String id;
  final String name;
  final String email;
  final String regNo;
  final String className;
  final String gender;
  final UserRole role;
  final String? avatarUrl;
  final String? phone;
  final double expectedFee;
  final double paidFee;
  final String? house;
  final String? club;
  final String? dob;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.regNo = '',
    this.className = '',
    this.gender = 'Male',
    required this.role,
    this.avatarUrl,
    this.phone,
    this.expectedFee = 0.0,
    this.paidFee = 0.0,
    this.house,
    this.club,
    this.dob,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    // Handle compressed keys ('r', 'n', 'c', 'p', 'g') alongside expanded
    final regNoVal = json['regNo'] ?? json['REGNO'] ?? json['r'] ?? json['id'] ?? '';
    final nameVal = json['name'] ?? json['STUDENT NAME'] ?? json['n'] ?? 'Student';
    final classVal = json['className'] ?? json['CLASS'] ?? json['c'] ?? '';
    final photoVal = json['photo'] ?? json['avatarUrl'] ?? json['p'];
    final genderVal = json['gender'] ?? json['GENDER'] ?? json['g'] ?? 'Male';

    return UserModel(
      id: json['id'] ?? regNoVal,
      name: nameVal.toString(),
      email: (json['email'] ?? '').toString(),
      regNo: regNoVal.toString(),
      className: classVal.toString(),
      gender: genderVal.toString(),
      role: _parseRole(json['role']?.toString()),
      avatarUrl: photoVal?.toString(),
      phone: json['phone']?.toString(),
      expectedFee: (json['expectedFee'] ?? 0).toDouble(),
      paidFee: (json['paidFee'] ?? json['paidAmount'] ?? 0).toDouble(),
      house: json['house']?.toString() ?? json['h']?.toString(),
      club: json['club']?.toString() ?? json['cl']?.toString(),
      dob: json['dob']?.toString() ?? json['d']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'regNo': regNo,
      'className': className,
      'gender': gender,
      'role': role.name,
      'avatarUrl': avatarUrl,
      'phone': phone,
      'expectedFee': expectedFee,
      'paidFee': paidFee,
      'house': house,
      'club': club,
      'dob': dob,
    };
  }

  static UserRole _parseRole(String? roleStr) {
    if (roleStr == null) return UserRole.student;
    switch (roleStr.toLowerCase()) {
      case 'student':
        return UserRole.student;
      case 'teacher':
      case 'staff':
        return UserRole.teacher;
      case 'admin':
        return UserRole.admin;
      case 'principal':
        return UserRole.principal;
      case 'bursar':
        return UserRole.bursar;
      default:
        return UserRole.student;
    }
  }
}
