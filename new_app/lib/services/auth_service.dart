import 'package:flutter/material.dart';
import '../models/user_model.dart';

class AuthService extends ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = false;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;

  AuthService() {
    // Default demo user for instant interactive testing
    _currentUser = UserModel(
      id: 'STU-2026-001',
      name: 'Alex Johnson',
      email: 'alex.j@school.edu',
      role: UserRole.student,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    );
  }

  Future<bool> login(String idOrEmail, String password, UserRole role) async {
    _isLoading = true;
    notifyListeners();

    await Future.delayed(const Duration(milliseconds: 600));

    _currentUser = UserModel(
      id: idOrEmail.toUpperCase(),
      name: idOrEmail.contains('@') ? idOrEmail.split('@')[0] : 'Demo User ($idOrEmail)',
      email: idOrEmail.contains('@') ? idOrEmail : '$idOrEmail@school.edu',
      role: role,
    );

    _isLoading = false;
    notifyListeners();
    return true;
  }

  void switchRole(UserRole role) {
    if (_currentUser != null) {
      _currentUser = UserModel(
        id: _currentUser!.id,
        name: _currentUser!.name,
        email: _currentUser!.email,
        role: role,
        avatarUrl: _currentUser!.avatarUrl,
      );
      notifyListeners();
    }
  }

  void logout() {
    _currentUser = null;
    notifyListeners();
  }
}
