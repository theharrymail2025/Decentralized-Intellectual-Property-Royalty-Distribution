;; Rights Holder Verification Contract
;; This contract validates legitimate IP owners

(define-data-var admin principal tx-sender)

;; Data structure for IP rights
(define-map rights-holders
  { ip-id: (string-ascii 36) }
  {
    owner: principal,
    title: (string-ascii 100),
    creation-date: uint,
    verified: bool
  }
)

;; Data structure for verification requests
(define-map verification-requests
  { ip-id: (string-ascii 36) }
  {
    requester: principal,
    title: (string-ascii 100),
    creation-date: uint,
    status: (string-ascii 20)
  }
)

;; Register a new IP
(define-public (register-ip (ip-id (string-ascii 36)) (title (string-ascii 100)))
  (let ((creation-date block-height))
    (if (is-none (map-get? rights-holders { ip-id: ip-id }))
        (begin
          (map-set verification-requests
            { ip-id: ip-id }
            {
              requester: tx-sender,
              title: title,
              creation-date: creation-date,
              status: "pending"
            }
          )
          (ok true))
        (err u1) ;; IP ID already exists
    )
  )
)

;; Verify an IP (admin only)
(define-public (verify-ip (ip-id (string-ascii 36)))
  (let ((request (map-get? verification-requests { ip-id: ip-id })))
    (if (and
          (is-eq tx-sender (var-get admin))
          (is-some request)
          (is-eq (get status (unwrap-panic request)) "pending"))
        (begin
          (map-set rights-holders
            { ip-id: ip-id }
            {
              owner: (get requester (unwrap-panic request)),
              title: (get title (unwrap-panic request)),
              creation-date: (get creation-date (unwrap-panic request)),
              verified: true
            }
          )
          (map-set verification-requests
            { ip-id: ip-id }
            (merge (unwrap-panic request) { status: "approved" })
          )
          (ok true))
        (err u2) ;; Not authorized or request not found
    )
  )
)

;; Reject an IP verification request (admin only)
(define-public (reject-ip (ip-id (string-ascii 36)))
  (let ((request (map-get? verification-requests { ip-id: ip-id })))
    (if (and
          (is-eq tx-sender (var-get admin))
          (is-some request)
          (is-eq (get status (unwrap-panic request)) "pending"))
        (begin
          (map-set verification-requests
            { ip-id: ip-id }
            (merge (unwrap-panic request) { status: "rejected" })
          )
          (ok true))
        (err u3) ;; Not authorized or request not found
    )
  )
)

;; Transfer IP ownership
(define-public (transfer-ip (ip-id (string-ascii 36)) (new-owner principal))
  (let ((ip-data (map-get? rights-holders { ip-id: ip-id })))
    (if (and
          (is-some ip-data)
          (is-eq (get owner (unwrap-panic ip-data)) tx-sender))
        (begin
          (map-set rights-holders
            { ip-id: ip-id }
            (merge (unwrap-panic ip-data) { owner: new-owner })
          )
          (ok true))
        (err u4) ;; Not authorized or IP not found
    )
  )
)

;; Check if an IP is verified
(define-read-only (is-verified (ip-id (string-ascii 36)))
  (let ((ip-data (map-get? rights-holders { ip-id: ip-id })))
    (if (is-some ip-data)
        (get verified (unwrap-panic ip-data))
        false
    )
  )
)

;; Get IP owner
(define-read-only (get-ip-owner (ip-id (string-ascii 36)))
  (let ((ip-data (map-get? rights-holders { ip-id: ip-id })))
    (if (is-some ip-data)
        (ok (get owner (unwrap-panic ip-data)))
        (err u5) ;; IP not found
    )
  )
)

;; Change admin (admin only)
(define-public (set-admin (new-admin principal))
  (if (is-eq tx-sender (var-get admin))
      (begin
        (var-set admin new-admin)
        (ok true))
      (err u6) ;; Not authorized
  )
)

