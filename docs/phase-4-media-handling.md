# Phase 4 WhatsApp Media Handling

## 1. Supported Media Formats & Limits

| Media Type | Max Size | Supported MIME Types |
|---|---|---|
| **Images** | 5 MB | `image/jpeg`, `image/png` |
| **Documents** | 100 MB | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain` |
| **Audio** | 16 MB | `audio/aac`, `audio/mp4`, `audio/mpeg`, `audio/amr`, `audio/ogg` |
| **Video** | 16 MB | `video/mp4`, `video/3gp` |

---

## 2. Inbound & Outbound Media Architecture

1. **Inbound Webhook**: Meta delivers a media payload containing a transient `media_id` (e.g. `104829102910`).
2. **Metadata Resolution**: `WhatsAppMediaService.getMediaDetails(mediaId)` retrieves the download URL, MIME type, and file size.
3. **Secure Download**: Media files are retrieved using bearer authentication with the system user token. Public URLs with exposed tokens are strictly forbidden.
