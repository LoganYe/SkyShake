import CryptoKit
import DeviceCheck
import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private let storedKeyIdPreference = "skyshake.appAttest.registeredKeyId"

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    if let controller = window?.rootViewController as? FlutterViewController {
      let channel = FlutterMethodChannel(
        name: "skyshake/app_attest",
        binaryMessenger: controller.binaryMessenger
      )
      channel.setMethodCallHandler { [weak self] call, result in
        self?.handleAppAttest(call, result: result)
      }
    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  private func handleAppAttest(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "isSupported":
      if #available(iOS 14.0, *) {
        result(DCAppAttestService.shared.isSupported)
      } else {
        result(false)
      }
    case "storedKeyId":
      result(UserDefaults.standard.string(forKey: storedKeyIdPreference))
    case "storeKeyId":
      guard let arguments = call.arguments as? [String: Any],
            let keyId = arguments["keyId"] as? String,
            !keyId.isEmpty else {
        result(invalidArguments("Expected a non-empty keyId."))
        return
      }
      UserDefaults.standard.set(keyId, forKey: storedKeyIdPreference)
      result(nil)
    case "clearKeyId":
      UserDefaults.standard.removeObject(forKey: storedKeyIdPreference)
      result(nil)
    case "generateKey":
      generateKey(result: result)
    case "attestKey":
      attestKey(call, result: result)
    case "generateAssertion":
      generateAssertion(call, result: result)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private func generateKey(result: @escaping FlutterResult) {
    guard appAttestIsSupported() else {
      result(unsupportedAppAttest())
      return
    }
    if #available(iOS 14.0, *) {
      DCAppAttestService.shared.generateKey { keyId, error in
        self.complete(result) {
          if let error = error {
            return self.appAttestError("GENERATE_KEY_FAILED", error: error)
          }
          guard let keyId = keyId, !keyId.isEmpty else {
            return FlutterError(
              code: "EMPTY_APP_ATTEST_KEY",
              message: "App Attest returned an empty key identifier.",
              details: nil
            )
          }
          return keyId
        }
      }
    }
  }

  private func attestKey(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    guard appAttestIsSupported() else {
      result(unsupportedAppAttest())
      return
    }
    guard let arguments = call.arguments as? [String: Any],
          let keyId = arguments["keyId"] as? String,
          let challenge = arguments["challenge"] as? String,
          !keyId.isEmpty,
          !challenge.isEmpty else {
      result(invalidArguments("Expected non-empty keyId and challenge."))
      return
    }
    if #available(iOS 14.0, *) {
      DCAppAttestService.shared.attestKey(
        keyId,
        clientDataHash: sha256(challenge)
      ) { attestation, error in
        self.complete(result) {
          if let error = error {
            return self.appAttestError("ATTEST_KEY_FAILED", error: error)
          }
          guard let attestation = attestation else {
            return FlutterError(
              code: "EMPTY_ATTESTATION",
              message: "App Attest returned an empty attestation.",
              details: nil
            )
          }
          return attestation.base64EncodedString()
        }
      }
    }
  }

  private func generateAssertion(
    _ call: FlutterMethodCall,
    result: @escaping FlutterResult
  ) {
    guard appAttestIsSupported() else {
      result(unsupportedAppAttest())
      return
    }
    guard let arguments = call.arguments as? [String: Any],
          let keyId = arguments["keyId"] as? String,
          let clientData = arguments["clientData"] as? String,
          !keyId.isEmpty,
          !clientData.isEmpty else {
      result(invalidArguments("Expected non-empty keyId and clientData."))
      return
    }
    if #available(iOS 14.0, *) {
      DCAppAttestService.shared.generateAssertion(
        keyId,
        clientDataHash: sha256(clientData)
      ) { assertion, error in
        self.complete(result) {
          if let error = error {
            return self.appAttestError("GENERATE_ASSERTION_FAILED", error: error)
          }
          guard let assertion = assertion else {
            return FlutterError(
              code: "EMPTY_ASSERTION",
              message: "App Attest returned an empty assertion.",
              details: nil
            )
          }
          return assertion.base64EncodedString()
        }
      }
    }
  }

  private func appAttestIsSupported() -> Bool {
    if #available(iOS 14.0, *) {
      return DCAppAttestService.shared.isSupported
    }
    return false
  }

  private func sha256(_ value: String) -> Data {
    return Data(SHA256.hash(data: Data(value.utf8)))
  }

  private func complete(_ result: @escaping FlutterResult, value: @escaping () -> Any?) {
    DispatchQueue.main.async {
      result(value())
    }
  }

  private func invalidArguments(_ message: String) -> FlutterError {
    return FlutterError(code: "INVALID_ARGUMENT", message: message, details: nil)
  }

  private func unsupportedAppAttest() -> FlutterError {
    return FlutterError(
      code: "APP_ATTEST_UNSUPPORTED",
      message: "App Attest is not supported on this device.",
      details: nil
    )
  }

  private func appAttestError(_ code: String, error: Error) -> FlutterError {
    let nativeError = error as NSError
    return FlutterError(
      code: code,
      message: error.localizedDescription,
      details: ["domain": nativeError.domain, "code": nativeError.code]
    )
  }
}
