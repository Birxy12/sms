import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../config/backend_config.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();
  factory SupabaseService() => _instance;
  SupabaseService._internal();

  /// Uploads binary bytes (e.g. image file bytes) to Supabase Storage Bucket
  Future<String?> uploadFile({
    required Uint8List fileBytes,
    required String fileName,
    String bucket = 'avatars',
    String contentType = 'image/jpeg',
  }) async {
    try {
      final uploadUrl = Uri.parse(
        '${BackendConfig.supabaseUrl}/storage/v1/object/$bucket/$fileName',
      );

      final response = await http.post(
        uploadUrl,
        headers: {
          'apikey': BackendConfig.supabaseAnonKey,
          'Authorization': 'Bearer ${BackendConfig.supabaseAnonKey}',
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: fileBytes,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Return Public URL of uploaded image
        return '${BackendConfig.supabaseUrl}/storage/v1/object/public/$bucket/$fileName';
      }
    } catch (_) {}
    return null;
  }

  /// Get public URL for any file stored in Supabase
  String getPublicUrl(String filePath, {String bucket = 'avatars'}) {
    return '${BackendConfig.supabaseUrl}/storage/v1/object/public/$bucket/$filePath';
  }
}
