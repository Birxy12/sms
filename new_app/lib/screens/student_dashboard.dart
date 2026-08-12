import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';
import '../widgets/stat_card.dart';
import '../widgets/nav_drawer.dart';

class StudentDashboard extends StatelessWidget {
  const StudentDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthService>(context);
    final user = auth.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (user != null && user.role == UserRole.admin) {
      // Redirect to admin view if user switched role to admin
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/admin');
      });
    }

    return Scaffold(
      drawer: const NavDrawer(),
      appBar: AppBar(
        title: const Text('BDSPORTAL'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_rounded),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Notifications up to date')),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.delayed(const Duration(seconds: 1));
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Dashboard Refreshed')),
            );
          }
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? [const Color(0xFF1E1B4B), const Color(0xFF312E81)]
                        : [const Color(0xFF4F46E5), const Color(0xFF06B6D4)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4F46E5).withOpacity(0.3),
                      blurRadius: 15,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome back, 👋',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.8),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            user?.name ?? 'Alex Johnson',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'ID: ${user?.id ?? "STU-2026-001"} • JSS 3 A',
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const CircleAvatar(
                      radius: 32,
                      backgroundColor: Colors.white24,
                      child: Icon(Icons.person_rounded, size: 36, color: Colors.white),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Stats Grid
              const Text(
                'Academic Overview',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.25,
                children: const [
                  StatCard(
                    title: 'Current GPA',
                    value: '3.85 / 4.0',
                    subtitle: 'Top 5%',
                    icon: Icons.auto_graph_rounded,
                    color: Color(0xFF4F46E5),
                  ),
                  StatCard(
                    title: 'Attendance',
                    value: '96.4%',
                    subtitle: '28/29 Days',
                    icon: Icons.check_circle_rounded,
                    color: Color(0xFF10B981),
                  ),
                  StatCard(
                    title: 'Assignments',
                    value: '8 / 9',
                    subtitle: '1 Pending',
                    icon: Icons.assignment_rounded,
                    color: Color(0xFFF59E0B),
                  ),
                  StatCard(
                    title: 'Fee Status',
                    value: 'PAID',
                    subtitle: '2nd Term',
                    icon: Icons.account_balance_wallet_rounded,
                    color: Color(0xFF06B6D4),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Quick Actions
              const Text(
                'Quick Features',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _QuickActionButton(
                      title: 'Check Results\n(Pinch Zoom)',
                      icon: Icons.assessment_rounded,
                      color: const Color(0xFF4F46E5),
                      onTap: () => Navigator.pushNamed(context, '/results'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QuickActionButton(
                      title: 'Student ID Card\n(3D & Zoom)',
                      icon: Icons.badge_rounded,
                      color: const Color(0xFF06B6D4),
                      onTap: () => Navigator.pushNamed(context, '/idcard'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _QuickActionButton(
                      title: 'Take CBT Exam',
                      icon: Icons.quiz_rounded,
                      color: const Color(0xFF10B981),
                      onTap: () => Navigator.pushNamed(context, '/cbt'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QuickActionButton(
                      title: 'Staff / Admin',
                      icon: Icons.admin_panel_settings_rounded,
                      color: const Color(0xFFF59E0B),
                      onTap: () => Navigator.pushNamed(context, '/admin'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.3), width: 1.2),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
