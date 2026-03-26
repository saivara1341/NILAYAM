package com.nilayam.dto;

public class RazorpayWebhookAcknowledge {
    private boolean accepted;
    private String event;
    private String reference;
    private String message;

    public RazorpayWebhookAcknowledge(boolean accepted, String event, String reference, String message) {
        this.accepted = accepted;
        this.event = event;
        this.reference = reference;
        this.message = message;
    }

    public boolean isAccepted() {
        return accepted;
    }

    public String getEvent() {
        return event;
    }

    public String getReference() {
        return reference;
    }

    public String getMessage() {
        return message;
    }
}
