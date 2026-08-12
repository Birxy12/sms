import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';

class NavDrawer extends StatelessWidget {
  const NavDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthService>(context);
    final user = auth.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          UserAccountsDrawerHeader(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark
                    ? [const Color(0xFF1E1B4B), const Color(0xFF312E81)]
                    : [const Color(0xFF4F46E5), const Color(0xFF6366F1)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            accountName: Text(
              user?.name ?? 'Guest User',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
            ),
            accountEmail: Text(
              user?.email ?? 'No email logged in',
              style: const TextStyle(color: Colors.white70),
            ),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'B',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF4F46E5),
                ),
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard_rounded),
            title: const Text('Dashboard'),
            onTap: () => Navigator.pushReplacementNamed(context, '/dashboard'),
          ),
          ListTile(
            leading: const Icon(Icons.assessment_rounded),
            title: const Text('Check Results (Pinch Zoom)'),
            onTap: () => Navigator.pushNamed(context, '/results'),
          ),
          ListTile(
            leading: const Icon(Icons.badge_rounded),
            title: const Text('Student ID Card'),
            onTap: () => Navigator.pushNamed(context, '/idcard'),
          ),
          ListTile(
            leading: const Icon(Icons.quiz_rounded),
            title: const Text('CBT Exams'),
            onTap: () => Navigator.pushNamed(context, '/cbt'),
          ),
          ListTile(
            leading: const Icon(Icons.admin_panel_settings_rounded),
            title: const Text('Admin / Staff Portal'),
            onTap: () => Navigator.pushNamed(context, '/admin'),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'Switch Role (Demo Mode)',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.grey[500],
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.person_rounded),
            title: const Text('Switch to Student'),
            trailing: user?.role == UserRole.student
                ? const Icon(Icons.check_circle_rounded, color: Colors.green)
                : null,
            onTap: () {
              auth.switchRole(UserRole.student);
              Navigator.pop(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.supervisor_account_rounded),
            title: const Text('Switch to Admin'),
            trailing: user?.role == UserRole.admin
                ? const Icon(Icons.check_circle_rounded, color: Colors.green)
                : null,
            onTap: () {
              auth.switchRole(UserRole.admin);
              Navigator.pop(context);
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
            title: const Text('Logout', style: TextStyle(color: Colors.redAccent)),
            onTap: () {
              auth.logout();
              Navigator.pushReplacementNamed(context, '/login');
            },
          ),
        ],
      ),
    );
  }
}
