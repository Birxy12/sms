import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../models/user_model.dart';
import '../models/notification_model.dart';
import '../widgets/stat_card.dart';
import '../widgets/nav_drawer.dart';

class StudentDashboard extends StatefulWidget {
  const StudentDashboard({super.key});

  @override
  State<StudentDashboard> createState() => _StudentDashboardState();
}

class _StudentDashboardState extends State<StudentDashboard> {
  final FirestoreService _firestoreService = FirestoreService();
  List<SchoolNotificationModel> _notifications = [];
  bool _isLoadingNotifs = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoadingNotifs = true);
    final list = await _firestoreService.getNotifications();
    if (mounted) {
      setState(() {
        _notifications = list;
        _isLoadingNotifs = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthService>(context);
    final user = auth.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (user != null && user.role == UserRole.admin) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/admin');
      });
    }

    final feeStatus = (user != null && user.paidFee >= user.expectedFee && user.expectedFee > 0)
        ? 'PAID'
        : (user != null && user.paidFee > 0)
            ? 'PARTIAL'
            : 'UNPAID';

    final feeSubtitle = user != null
        ? '₦${user.paidFee.toInt()} / ₦${user.expectedFee.toInt()}'
        : '2nd Term';

    return Scaffold(
      drawer: const NavDrawer(),
      appBar: AppBar(
        title: const Text('BDSPORTAL'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_rounded),
            onPressed: () {
              _showNotificationsSheet(context);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _loadNotifications();
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
                              'Reg No: ${user?.regNo.isNotEmpty == true ? user!.regNo : (user?.id ?? "STU-2026-001")} • ${user?.className.isNotEmpty == true ? user!.className : "JSS 1"}',
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: Colors.white24,
                      backgroundImage: user?.avatarUrl != null && user!.avatarUrl!.startsWith('http')
                          ? NetworkImage(user.avatarUrl!)
                          : null,
                      child: user?.avatarUrl == null || !user!.avatarUrl!.startsWith('http')
                          ? const Icon(Icons.person_rounded, size: 36, color: Colors.white)
                          : null,
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
                children: [
                  const StatCard(
                    title: 'Current GPA',
                    value: '3.85 / 4.0',
                    subtitle: 'Top 5%',
                    icon: Icons.auto_graph_rounded,
                    color: Color(0xFF4F46E5),
                  ),
                  const StatCard(
                    title: 'Attendance',
                    value: '96.4%',
                    subtitle: '28/29 Days',
                    icon: Icons.check_circle_rounded,
                    color: Color(0xFF10B981),
                  ),
                  const StatCard(
                    title: 'Assignments',
                    value: '8 / 9',
                    subtitle: '1 Pending',
                    icon: Icons.assignment_rounded,
                    color: Color(0xFFF59E0B),
                  ),
                  StatCard(
                    title: 'Fee Status',
                    value: feeStatus,
                    subtitle: feeSubtitle,
                    icon: Icons.account_balance_wallet_rounded,
                    color: feeStatus == 'PAID' ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // School Announcements Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Announcements',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  TextButton(
                    onPressed: () => _showNotificationsSheet(context),
                    child: const Text('View All'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (_isLoadingNotifs)
                const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()))
              else if (_notifications.isEmpty)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Text('No announcements at this time.'),
                  ),
                )
              else
                Column(
                  children: _notifications.take(2).map((notif) {
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF4F46E5).withOpacity(0.1),
                          child: const Icon(Icons.campaign_rounded, color: Color(0xFF4F46E5)),
                        ),
                        title: Text(notif.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Text(notif.message, maxLines: 2, overflow: TextOverflow.ellipsis),
                        trailing: Text(notif.createdAt, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      ),
                    );
                  }).toList(),
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

  void _showNotificationsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          expand: false,
          builder: (context, scrollController) {
            return Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'School Announcements',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const Divider(),
                  Expanded(
                    child: ListView.builder(
                      controller: scrollController,
                      itemCount: _notifications.length,
                      itemBuilder: (context, index) {
                        final notif = _notifications[index];
                        return Card(
                          margin: const EdgeInsets.symmetric(vertical: 8),
                          child: ListTile(
                            leading: const Icon(Icons.notifications_active_rounded, color: Color(0xFF4F46E5)),
                            title: Text(notif.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                Text(notif.message),
                                const SizedBox(height: 6),
                                Text(
                                  'Posted: ${notif.createdAt}',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
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
