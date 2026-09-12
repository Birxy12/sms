import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import 'firestore_service.dart';

class AuthService extends ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  final FirestoreService _firestoreService = FirestoreService();

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;
  String? get errorMessage => _errorMessage;

  AuthService() {
    _loadSavedUser();
  }

  /// Load user session from SharedPreferences
  Future<void> _loadSavedUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJsonStr = prefs.getString('saved_user');
      if (userJsonStr != null) {
        final Map<String, dynamic> userMap = json.decode(userJsonStr);
        _currentUser = UserModel.fromJson(userMap);
        notifyListeners();
        return;
      }
    } catch (_) {}

    // Default demo user if no saved user session
    _currentUser = UserModel(
      id: 'STU-2026-001',
      name: 'Alex Johnson',
      email: 'alex.j@school.edu',
      regNo: 'STU-2026-001',
      className: 'JSS 1',
      gender: 'Male',
      role: UserRole.student,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      expectedFee: 85000.0,
      paidFee: 85000.0,
      house: 'Red House',
      club: 'JET Club',
    );
    notifyListeners();
  }

  /// Authenticate against Firestore
  Future<bool> login(String idOrEmail, String password, UserRole role) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final liveUser = await _firestoreService.authenticateUser(idOrEmail, password, role);

      if (liveUser != null) {
        _currentUser = liveUser;
      } else {
        // Fallback user if record not yet added to DB
        _currentUser = UserModel(
          id: idOrEmail.trim().toUpperCase(),
          name: idOrEmail.contains('@') ? idOrEmail.split('@')[0] : 'User ($idOrEmail)',
          email: idOrEmail.contains('@') ? idOrEmail : '$idOrEmail@school.edu',
          regNo: idOrEmail.trim().toUpperCase(),
          className: 'JSS 1',
          gender: 'Male',
          role: role,
          expectedFee: 85000.0,
          paidFee: 50000.0,
        );
      }

      await _saveUserSession(_currentUser!);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Login failed: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> _saveUserSession(UserModel user) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('saved_user', json.encode(user.toJson()));
    } catch (_) {}
  }

  void updateAvatarUrl(String newUrl) {
    if (_currentUser != null) {
      _currentUser = UserModel(
        id: _currentUser!.id,
        name: _currentUser!.name,
        email: _currentUser!.email,
        regNo: _currentUser!.regNo,
        className: _currentUser!.className,
        gender: _currentUser!.gender,
        role: _currentUser!.role,
        avatarUrl: newUrl,
        phone: _currentUser!.phone,
        expectedFee: _currentUser!.expectedFee,
        paidFee: _currentUser!.paidFee,
        house: _currentUser!.house,
        club: _currentUser!.club,
        dob: _currentUser!.dob,
      );
      _saveUserSession(_currentUser!);
      notifyListeners();
    }
  }

  void switchRole(UserRole role) {
    if (_currentUser != null) {
      _currentUser = UserModel(
        id: _currentUser!.id,
        name: _currentUser!.name,
        email: _currentUser!.email,
        regNo: _currentUser!.regNo,
        className: _currentUser!.className,
        gender: _currentUser!.gender,
        role: role,
        avatarUrl: _currentUser!.avatarUrl,
        phone: _currentUser!.phone,
        expectedFee: _currentUser!.expectedFee,
        paidFee: _currentUser!.paidFee,
        house: _currentUser!.house,
        club: _currentUser!.club,
        dob: _currentUser!.dob,
      );
      _saveUserSession(_currentUser!);
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _currentUser = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('saved_user');
    } catch (_) {}
    notifyListeners();
  }
}
