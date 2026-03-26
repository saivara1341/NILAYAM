package com.nilayam.controller;

import com.nilayam.dto.RazorpayOrderRequest;
import com.nilayam.dto.RazorpayRouteTransferRequest;
import com.nilayam.dto.RazorpayWebhookAcknowledge;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import jakarta.annotation.PostConstruct;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${cors.allowed-origins}")
public class RazorpayController {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    @Value("${razorpay.route.enabled:false}")
    private boolean routeEnabled;

    private RazorpayClient razorpayClient;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final Set<String> processedWebhookReferences = ConcurrentHashMap.newKeySet();

    @PostConstruct
    public void init() throws RazorpayException {
        if (keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank()) {
            return;
        }
        this.razorpayClient = new RazorpayClient(keyId, keySecret);
    }

    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody RazorpayOrderRequest request) {
        if (razorpayClient == null) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Razorpay is not configured on the server"));
        }
        if (request.getAmount() == null || request.getAmount() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Amount must be greater than zero"));
        }
        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", Math.round(request.getAmount() * 100));
            orderRequest.put("currency", request.getCurrency() != null ? request.getCurrency() : "INR");
            orderRequest.put("receipt", request.getReceipt() != null ? request.getReceipt() : "rcpt_" + System.currentTimeMillis());

            if (request.getNotes() != null) {
                orderRequest.put("notes", new JSONObject(request.getNotes()));
            }

            Order order = razorpayClient.orders.create(orderRequest);
            return ResponseEntity.ok(Map.of(
                "id", order.get("id"),
                "amount", order.get("amount"),
                "currency", order.get("currency"),
                "receipt", order.get("receipt"),
                "status", order.get("status")
            ));
        } catch (RazorpayException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to create Razorpay order", "details", e.getMessage()));
        }
    }

    @PostMapping("/verify-payment")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, String> data) {
        if (keySecret == null || keySecret.isBlank()) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Razorpay verification is not configured on the server"));
        }
        String orderId = data.get("razorpay_order_id");
        String paymentId = data.get("razorpay_payment_id");
        String signature = data.get("razorpay_signature");

        if (orderId == null || orderId.isBlank() || paymentId == null || paymentId.isBlank() || signature == null || signature.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Missing Razorpay verification fields"));
        }

        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature", signature);

            boolean isValid = com.razorpay.Utils.verifyPaymentSignature(attributes, keySecret);

            if (isValid) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Payment verified successfully"));
            }
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid payment signature"));
        } catch (RazorpayException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Payment verification failed", "details", e.getMessage()));
        }
    }

    @PostMapping("/payouts/route-transfer")
    public ResponseEntity<?> createRouteTransfer(@RequestBody RazorpayRouteTransferRequest request) {
        if (!routeEnabled) {
            return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED)
                .body(Map.of("error", "Razorpay Route transfer flow is disabled on the server"));
        }
        if (request.getRazorpayPaymentId() == null || request.getRazorpayPaymentId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "razorpayPaymentId is required"));
        }
        if (request.getLinkedAccountId() == null || request.getLinkedAccountId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "linkedAccountId is required"));
        }
        if (request.getAmount() == null || request.getAmount() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "amount must be greater than zero"));
        }

        try {
            JSONObject transfer = new JSONObject();
            transfer.put("account", request.getLinkedAccountId());
            transfer.put("amount", Math.round(request.getAmount() * 100));
            transfer.put("currency", request.getCurrency() == null || request.getCurrency().isBlank() ? "INR" : request.getCurrency());
            transfer.put("notes", new JSONObject(Map.of(
                "purpose", "owner_settlement",
                "remarks", request.getNotes() == null ? "" : request.getNotes()
            )));

            if (Boolean.TRUE.equals(request.getOnHold())) {
                transfer.put("on_hold", true);
            }

            JSONObject payload = new JSONObject();
            payload.put("transfers", new JSONArray().put(transfer));

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.razorpay.com/v1/payments/" + request.getRazorpayPaymentId() + "/transfers"))
                .header("Authorization", basicAuthHeader())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JSONObject body = new JSONObject(response.body());
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "paymentId", request.getRazorpayPaymentId(),
                    "linkedAccountId", request.getLinkedAccountId(),
                    "raw", body.toMap()
                ));
            }

            return ResponseEntity.status(response.statusCode()).body(Map.of(
                "success", false,
                "error", "Failed to create linked-account transfer",
                "details", response.body()
            ));
        } catch (IOException | InterruptedException ex) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Route transfer request failed",
                "details", ex.getMessage()
            ));
        }
    }

    @PostMapping("/razorpay/webhooks")
    public ResponseEntity<?> handleWebhook(
        @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
        @RequestBody String rawBody
    ) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED)
                .body(Map.of("error", "Webhook secret is not configured"));
        }
        if (signature == null || signature.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing X-Razorpay-Signature header"));
        }

        try {
            boolean valid = com.razorpay.Utils.verifyWebhookSignature(rawBody, signature, webhookSecret);
            if (!valid) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid webhook signature"));
            }

            JSONObject body = new JSONObject(rawBody);
            String event = body.optString("event", "unknown");
            JSONObject payload = body.optJSONObject("payload");
            String reference = extractWebhookReference(payload);

            if (reference != null && !reference.isBlank() && !processedWebhookReferences.add(reference)) {
                return ResponseEntity.ok(new RazorpayWebhookAcknowledge(true, event, reference, "Duplicate webhook ignored safely"));
            }

            return ResponseEntity.ok(new RazorpayWebhookAcknowledge(
                true,
                event,
                reference,
                "Webhook verified. Persist event into ERP tables and trigger reconciliation/payout workflows."
            ));
        } catch (RazorpayException ex) {
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Webhook verification failed",
                "details", ex.getMessage()
            ));
        }
    }

    private String basicAuthHeader() {
        String raw = keyId + ":" + keySecret;
        return "Basic " + Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private String extractWebhookReference(JSONObject payload) {
        if (payload == null) return null;

        if (payload.has("payment")) {
            JSONObject entity = payload.getJSONObject("payment").optJSONObject("entity");
            return entity != null ? entity.optString("id", null) : null;
        }
        if (payload.has("transfer")) {
            JSONObject entity = payload.getJSONObject("transfer").optJSONObject("entity");
            return entity != null ? entity.optString("id", null) : null;
        }
        if (payload.has("order")) {
            JSONObject entity = payload.getJSONObject("order").optJSONObject("entity");
            return entity != null ? entity.optString("id", null) : null;
        }
        return null;
    }
}
