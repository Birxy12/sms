import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';
import '../widgets/stat_card.dart';
import '../widgets/nav_drawer.dart';

class AdminDashboard extends StatelessWidget {
  const AdminDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthService>(context);
    final user = auth.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      drawer: const NavDrawer(),
      appBar: AppBar(
        title: const Text('Admin & Staff Portal'),
        actions: [
          IconButton(
            icon: const Icon(Icons.swap_horiz_rounded),
            tooltip: 'Switch to Student View',
            onPressed: () {
              auth.switchRole(UserRole.student);
              Navigator.pushReplacementNamed(context, '/dashboard');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Admin Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDark
                      ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                      : [const Color(0xFF0F172A), const Color(0xFF1E293B)],
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'ADMINISTRATOR',
                          style: TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const Icon(Icons.verified_user_rounded, color: Color(0xFFF59E0B)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.name ?? 'Admin User',
                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'BDS International Academy Control Hub',
                    style: TextStyle(color: Colors.grey[400], fontSize: 13),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Stats
            const Text('School Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
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
                  title: 'Total Students',
                  value: '1,248',
                  subtitle: '+32 this term',
                  icon: Icons.people_alt_rounded,
                  color: Color(0xFF4F46E5),
                ),
                StatCard(
                  title: 'Active Staff',
                  value: '84',
                  subtitle: '100% Present',
                  icon: Icons.badge_rounded,
                  color: Color(0xFF10B981),
                ),
                StatCard(
                  title: 'Revenue Collected',
                  value: '₦42.5M',
                  subtitle: '88% Paid',
                  icon: Icons.payments_rounded,
                  color: Color(0xFFF59E0B),
                ),
                StatCard(
                  title: 'Active CBT Exams',
                  value: '14',
                  subtitle: 'Running Today',
                  icon: Icons.quiz_rounded,
                  color: Color(0xFF06B6D4),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Admin Modules
            const Text('Management Tools', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            _AdminToolTile(
              title: 'Student Management & Admissions',
              subtitle: 'Enroll, edit, and assign classes',
              icon: Icons.person_add_alt_1_rounded,
              color: const Color(0xFF4F46E5),
            ),
            _AdminToolTile(
              title: 'CBT Bank & Question Creator',
              subtitle: 'Manage CBT exams and automated marking',
              icon: Icons.quiz_rounded,
              color: const Color(0xFF06B6D4),
            ),
            _AdminToolTile(
              title: 'Result Processing & Approval',
              subtitle: 'Review report cards and publish results',
              icon: Icons.assessment_rounded,
              color: const Color(0xFF10B981),
            ),
            _AdminToolTile(
              title: 'Bursary & Fee Portal',
              subtitle: 'Track payments and receipt generation',
              icon: Icons.account_balance_rounded,
              color: const Color(0xFFF59E0B),
            ),
          ],
        ),
      ),
    );
  }
}

class _AdminToolTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _AdminToolTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Opening $title module...')),
          );
        },
      ),
    );
  }
}
