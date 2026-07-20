import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../core/app_config.dart';
import 'app_attest_authorizer.dart';
import 'tracking_repository.dart';

class ApiPayloadResponse {
  const ApiPayloadResponse({required this.statusCode, required this.payload});

  final int statusCode;
  final Map<String, dynamic> payload;
}

abstract interface class BackendApiClient {
  Future<ApiPayloadResponse> getJson(
    String path, {
    Map<String, dynamic>? queryParameters,
  });

  Future<ApiPayloadResponse> postJson(String path, {Object? body});
}

class DioBackendApiClient implements BackendApiClient {
  DioBackendApiClient(
    this.config, {
    Dio? dio,
    RequestAuthorizer? authorizer,
    AppAttestPlatform appAttestPlatform =
        const MethodChannelAppAttestPlatform(),
  }) : _dio = dio ?? _buildDio(config) {
    _authorizer =
        authorizer ??
        (config.environment == AppEnvironment.production
            ? AppAttestRequestAuthorizer(_dio, platform: appAttestPlatform)
            : null);
  }

  final AppConfig config;
  final Dio _dio;
  late final RequestAuthorizer? _authorizer;

  @override
  Future<ApiPayloadResponse> getJson(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final query = queryParameters ?? const <String, dynamic>{};
    return _performRequest(
      () async => _dio.get<dynamic>(
        path,
        queryParameters: query,
        options: Options(
          headers: await _authorizationHeaders(
            method: 'GET',
            path: path,
            query: query,
            body: null,
          ),
        ),
      ),
    );
  }

  @override
  Future<ApiPayloadResponse> postJson(String path, {Object? body}) async {
    return _performRequest(
      () async => _dio.post<dynamic>(
        path,
        data: body,
        options: Options(
          headers: await _authorizationHeaders(
            method: 'POST',
            path: path,
            query: const {},
            body: body,
          ),
        ),
      ),
    );
  }

  Future<ApiPayloadResponse> _performRequest(
    Future<Response<dynamic>> Function() operation,
  ) async {
    try {
      var response = await operation();
      if (_isInvalidAttestation(response) && _authorizer != null) {
        await _authorizer.invalidate();
        response = await operation();
      }
      return ApiPayloadResponse(
        statusCode: response.statusCode ?? 500,
        payload: _coerceJsonMap(response.data),
      );
    } on DioException catch (error) {
      throw _mapDioException(error);
    }
  }

  Future<Map<String, String>?> _authorizationHeaders({
    required String method,
    required String path,
    required Map<String, dynamic> query,
    required Object? body,
  }) {
    final authorizer = _authorizer;
    if (authorizer == null) {
      return Future.value(null);
    }
    return authorizer.authorize(
      method: method,
      path: path,
      query: query,
      body: body,
    );
  }

  bool _isInvalidAttestation(Response<dynamic> response) {
    if (response.statusCode != 401) {
      return false;
    }
    final payload = _coerceJsonMap(response.data);
    return payload['code'] == 'app_attestation_invalid';
  }

  Map<String, dynamic> _coerceJsonMap(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data;
    }
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    if (data is String && data.trim().isNotEmpty) {
      final decoded = jsonDecode(data);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
    }
    throw const TrackingException(
      'Backend returned an invalid JSON document.',
      code: 'invalid_backend_payload',
    );
  }

  TrackingException _mapDioException(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return TrackingException(
          'Request to ${config.backendBaseUrl} timed out. Check the backend or try again.',
          code: 'backend_timeout',
          retryable: true,
        );
      case DioExceptionType.badCertificate:
        return TrackingException(
          'Could not establish a secure connection to ${config.backendBaseUrl}.',
          code: 'backend_tls_failed',
        );
      case DioExceptionType.cancel:
        return const TrackingException(
          'The backend request was cancelled before completion.',
          code: 'backend_request_cancelled',
        );
      case DioExceptionType.connectionError:
      case DioExceptionType.unknown:
        return TrackingException(
          _buildUnreachableMessage(),
          code: 'backend_unreachable',
          retryable: true,
        );
      case DioExceptionType.badResponse:
        return const TrackingException(
          'Backend returned an unexpected response.',
          code: 'backend_bad_response',
        );
    }
  }

  String _buildUnreachableMessage() {
    final baseMessage =
        'Could not reach the backend at ${config.backendBaseUrl}. Make sure the backend service is running.';

    if (kIsWeb) {
      return '$baseMessage If you are using Flutter web, the backend must also allow cross-origin requests.';
    }

    return baseMessage;
  }
}

Dio _buildDio(AppConfig config) {
  return Dio(
    BaseOptions(
      baseUrl: config.backendBaseUrl,
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 10),
      responseType: ResponseType.json,
      validateStatus: (_) => true,
    ),
  );
}
