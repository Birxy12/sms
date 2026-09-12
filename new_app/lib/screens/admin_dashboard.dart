import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../models/user_model.dart';
import '../widgets/stat_card.dart';
import '../widgets/nav_drawer.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  final FirestoreService _firestoreService = FirestoreService();
  Map<String, dynamic> _stats = {
    'totalStudents': 185,
    'totalStaff': 24,
    'totalMarksRecords': 142,
  };
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadLiveStats();
  }

  Future<void> _loadLiveStats() async {
    setState(() => _isLoading = true);
    final data = await _firestoreService.getAdminStats();
    if (mounted) {
      setState(() {
        _stats = data;
        _isLoading = false;
      });
    }
  }

  void _showPostNotificationDialog(BuildContext context) {
    final titleController = TextEditingController();
    final messageController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Broadcast Announcement'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                  labelText: 'Announcement Title',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: messageController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Message Body',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                final title = titleController.text.trim();
                final msg = messageController.text.trim();
                if (title.isNotEmpty && msg.isNotEmpty) {
                  final messenger = ScaffoldMessenger.of(context);
                  Navigator.pop(ctx);
                  final success = await _firestoreService.createNotification(title, msg, 'general');
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Announcement broadcasted!' : 'Failed to post announcement.'),
                    ),
                  );
                }
              },
              child: const Text('Post to School'),
            ),
          ],
        );
      },
    );
  }

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
            icon: const Icon(Icons.add_alert_rounded),
            tooltip: 'Post Announcement',
            onPressed: () => _showPostNotificationDialog(context),
          ),
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
      body: RefreshIndicator(
        onRefresh: _loadLiveStats,
        child: SingleChildScrollView(
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
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('School Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  if (_isLoading)
                    const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                ],
              ),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.25,
                children: [
                  StatCard(
                    title: 'Total Students',
                    value: '${_stats['totalStudents']}',
                    subtitle: 'Live in Database',
                    icon: Icons.people_alt_rounded,
                    color: const Color(0xFF4F46E5),
                  ),
                  StatCard(
                    title: 'Active Staff',
                    value: '${_stats['totalStaff']}',
                    subtitle: 'Teachers & Admin',
                    icon: Icons.badge_rounded,
                    color: const Color(0xFF10B981),
                  ),
                  StatCard(
                    title: 'Report Cards',
                    value: '${_stats['totalMarksRecords']}',
                    subtitle: 'Result Records',
                    icon: Icons.assessment_rounded,
                    color: const Color(0xFFF59E0B),
                  ),
                  const StatCard(
                    title: 'Active CBT Exams',
                    value: '14',
                    subtitle: 'Online Exams',
                    icon: Icons.quiz_rounded,
                    color: Color(0xFF06B6D4),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Management Tools
              const Text('Management Tools', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              _AdminToolTile(
                title: 'Broadcast School Announcement',
                subtitle: 'Send live notice to student & staff portals',
                icon: Icons.campaign_rounded,
                color: const Color(0xFF4F46E5),
                onTap: () => _showPostNotificationDialog(context),
              ),
              _AdminToolTile(
                title: 'CBT Bank & Question Creator',
                subtitle: 'Manage CBT exams and automated marking',
                icon: Icons.quiz_rounded,
                color: const Color(0xFF06B6D4),
                onTap: () => Navigator.pushNamed(context, '/cbt'),
              ),
              _AdminToolTile(
                title: 'Result Processing & Approval',
                subtitle: 'Review report cards and publish results',
                icon: Icons.assessment_rounded,
                color: const Color(0xFF10B981),
                onTap: () => Navigator.pushNamed(context, '/results'),
              ),
              _AdminToolTile(
                title: 'Bursary & Fee Portal',
                subtitle: 'Track payments and receipt generation',
                icon: Icons.account_balance_rounded,
                color: const Color(0xFFF59E0B),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Bursary fee records active')),
                  );
                },
              ),
            ],
          ),
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
  final VoidCallback onTap;

  const _AdminToolTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
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
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
        onTap: onTap,
      ),
    );
  }
}
