import 'package:flutter/material.dart';
import '../widgets/pinch_zoom_wrapper.dart';
import '../models/result_model.dart';

class ResultsScreen extends StatelessWidget {
  const ResultsScreen({super.key});

  final List<SubjectScore> mockScores = const [
    SubjectScore(subjectName: 'Mathematics', caScore: 28, examScore: 64, totalScore: 92, grade: 'A1', remark: 'Excellent'),
    SubjectScore(subjectName: 'English Language', caScore: 26, examScore: 59, totalScore: 85, grade: 'A1', remark: 'Very Good'),
    SubjectScore(subjectName: 'Basic Science', caScore: 29, examScore: 60, totalScore: 89, grade: 'A1', remark: 'Excellent'),
    SubjectScore(subjectName: 'Computer Studies (ICT)', caScore: 30, examScore: 65, totalScore: 95, grade: 'A1', remark: 'Outstanding'),
    SubjectScore(subjectName: 'Civic Education', caScore: 24, examScore: 54, totalScore: 78, grade: 'B2', remark: 'Good'),
    SubjectScore(subjectName: 'Social Studies', caScore: 25, examScore: 56, totalScore: 81, grade: 'A1', remark: 'Very Good'),
    SubjectScore(subjectName: 'Business Studies', caScore: 27, examScore: 58, totalScore: 85, grade: 'A1', remark: 'Very Good'),
    SubjectScore(subjectName: 'Agricultural Science', caScore: 26, examScore: 61, totalScore: 87, grade: 'A1', remark: 'Excellent'),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Result Sheet'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_rounded),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Exporting Result Sheet PDF...')),
              );
            },
          ),
        ],
      ),
      body: PinchZoomWrapper(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 15,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Banner
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF4F46E5).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.school_rounded, color: Color(0xFF4F46E5), size: 36),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'BDS INTERNATIONAL ACADEMY',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                          ),
                          Text(
                            'Official Terminal Academic Report Card',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Divider(height: 30),

                // Student Metadata
                const Wrap(
                  spacing: 20,
                  runSpacing: 10,
                  children: [
                    _MetaDetail(label: 'Student Name', value: 'Alex Johnson'),
                    _MetaDetail(label: 'Reg Number', value: 'STU-2026-001'),
                    _MetaDetail(label: 'Class', value: 'JSS 3 A'),
                    _MetaDetail(label: 'Session', value: '2025/2026'),
                    _MetaDetail(label: 'Term', value: '2nd Term'),
                    _MetaDetail(label: 'Position', value: '1st out of 42'),
                  ],
                ),
                const SizedBox(height: 24),

                // Scores Table
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    headingRowColor: WidgetStateProperty.all(
                      const Color(0xFF4F46E5).withOpacity(0.1),
                    ),
                    columns: const [
                      DataColumn(label: Text('Subject', style: TextStyle(fontWeight: FontWeight.bold))),
                      DataColumn(label: Text('C.A (30)', style: TextStyle(fontWeight: FontWeight.bold))),
                      DataColumn(label: Text('Exam (70)', style: TextStyle(fontWeight: FontWeight.bold))),
                      DataColumn(label: Text('Total (100)', style: TextStyle(fontWeight: FontWeight.bold))),
                      DataColumn(label: Text('Grade', style: TextStyle(fontWeight: FontWeight.bold))),
                      DataColumn(label: Text('Remark', style: TextStyle(fontWeight: FontWeight.bold))),
                    ],
                    rows: mockScores.map((s) {
                      return DataRow(
                        cells: [
                          DataCell(Text(s.subjectName, style: const TextStyle(fontWeight: FontWeight.w600))),
                          DataCell(Text('${s.caScore.toInt()}')),
                          DataCell(Text('${s.examScore.toInt()}')),
                          DataCell(Text(
                            '${s.totalScore.toInt()}',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF4F46E5)),
                          )),
                          DataCell(
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withOpacity(0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                s.grade,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF10B981),
                                ),
                              ),
                            ),
                          ),
                          DataCell(Text(s.remark)),
                        ],
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 24),

                // Grand Total & Average
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF4F46E5).withOpacity(0.08),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Overall Average:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      Text('86.6%', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Color(0xFF4F46E5))),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MetaDetail extends StatelessWidget {
  final String label;
  final String value;

  const _MetaDetail({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
