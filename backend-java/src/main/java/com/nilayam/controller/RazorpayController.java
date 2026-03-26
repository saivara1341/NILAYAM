package com.nilayam.controller;

import com.nilayam.dto.RazorpayOrderRequest;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import jakarta.annotation.PostConstruct;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${cors.allowed-origins}")
public class RazorpayController {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    private RazorpayClient razorpayClient;

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
            orderRequest.put("amount", Math.round(request.getAmount() * 100)); // amount in the smallest currency unit
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
            } else {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid payment signature"));
            }
        } catch (RazorpayException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Payment verification failed", "details", e.getMessage()));
        }
    }
}
