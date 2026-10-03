# Local image moderation model

Bavel serves the NSFWJS MobileNetV2 model and its weights from this directory. The model is loaded from local disk by the application server; image bytes are not sent to an external AI or image-classification provider.

- Upstream: `infinitered/nsfwjs`
- Revision: `d55a54c51f14380670064cc129b2ea51029c5e46`
- License: MIT (`LICENSE`)
- Model: `mobilenet_v2`

The model is a general-purpose open-source image classifier, not a model trained by Bavel. Its predictions can be wrong and must not be presented as proof of a person's identity or intent. Profile-photo uploads are rejected at a lower Porn/Hentai score threshold than chat images; chat images that appear suggestive are marked for blur, while high-confidence explicit classifications are rejected. These thresholds are conservative product rules, not measured accuracy claims.
