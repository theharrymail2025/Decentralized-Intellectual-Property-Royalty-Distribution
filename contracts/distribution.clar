;; Distribution Contract
;; This contract automates royalty payments to multiple stakeholders

(define-data-var admin principal tx-sender)

;; Data structure for stakeholders
(define-map stakeholders
  {
    ip-id: (string-ascii 36),
    stakeholder: principal
  }
  { share: uint }  ;; Share in basis points (100 = 1%)
)

;; Data structure for distribution records
(define-map distribution-records
  {
    ip-id: (string-ascii 36),
    period: uint
  }
  {
    total-distributed: uint,
    distribution-date: uint,
    completed: bool
  }
)

;; Data structure for IP owners (simplified approach instead of contract-call)
(define-map ip-owners
  { ip-id: (string-ascii 36) }
  { owner: principal }
)

;; Data structure for calculated revenue (simplified approach instead of contract-call)
(define-map revenue-data
  {
    ip-id: (string-ascii 36),
    period: uint
  }
  { amount: uint }
)

;; Register IP owner (admin only) - simplified approach
(define-public (register-ip-owner (ip-id (string-ascii 36)) (owner principal))
  (if (is-eq tx-sender (var-get admin))
      (begin
        (map-set ip-owners
          { ip-id: ip-id }
          { owner: owner }
        )
        (ok true))
      (err u1) ;; Not authorized
  )
)

;; Record revenue data (admin only) - simplified approach
(define-public (record-revenue (ip-id (string-ascii 36)) (period uint) (amount uint))
  (if (is-eq tx-sender (var-get admin))
      (begin
        (map-set revenue-data
          { ip-id: ip-id, period: period }
          { amount: amount }
        )
        (ok true))
      (err u2) ;; Not authorized
  )
)

;; Add a stakeholder for an IP
(define-public (add-stakeholder (ip-id (string-ascii 36)) (stakeholder principal) (share uint))
  (let ((owner-data (map-get? ip-owners { ip-id: ip-id })))
    (if (and
          (is-some owner-data)
          (is-eq tx-sender (get owner (unwrap-panic owner-data))))
        (begin
          (map-set stakeholders
            { ip-id: ip-id, stakeholder: stakeholder }
            { share: share }
          )
          (ok true))
        (err u3) ;; Not authorized or IP not found
    )
  )
)

;; Remove a stakeholder for an IP
(define-public (remove-stakeholder (ip-id (string-ascii 36)) (stakeholder principal))
  (let ((owner-data (map-get? ip-owners { ip-id: ip-id })))
    (if (and
          (is-some owner-data)
          (is-eq tx-sender (get owner (unwrap-panic owner-data))))
        (begin
          (map-delete stakeholders { ip-id: ip-id, stakeholder: stakeholder })
          (ok true))
        (err u4) ;; Not authorized or IP not found
    )
  )
)

;; Get stakeholder share
(define-read-only (get-stakeholder-share (ip-id (string-ascii 36)) (stakeholder principal))
  (let ((share-data (map-get? stakeholders { ip-id: ip-id, stakeholder: stakeholder })))
    (if (is-some share-data)
        (ok (get share (unwrap-panic share-data)))
        (ok u0) ;; Stakeholder not found
    )
  )
)

;; Distribute revenue for an IP for a specific period
(define-public (distribute-revenue (ip-id (string-ascii 36)) (period uint))
  (let (
    (revenue-entry (map-get? revenue-data { ip-id: ip-id, period: period }))
    (distribution-key { ip-id: ip-id, period: period })
    (distribution-record (map-get? distribution-records distribution-key))
  )
    (if (and
          (is-some revenue-entry)
          (> (get amount (unwrap-panic revenue-entry)) u0)
          (or
            (is-none distribution-record)
            (not (get completed (unwrap-panic distribution-record)))))
        (begin
          ;; In a real implementation, this would distribute to all stakeholders
          ;; based on their shares. For simplicity, we're just recording the distribution.
          (map-set distribution-records
            distribution-key
            {
              total-distributed: (get amount (unwrap-panic revenue-entry)),
              distribution-date: block-height,
              completed: true
            }
          )
          (ok true))
        (err u5) ;; Failed to get revenue or already distributed
    )
  )
)

;; Check if revenue has been distributed for an IP for a specific period
(define-read-only (is-revenue-distributed (ip-id (string-ascii 36)) (period uint))
  (let ((distribution-record (map-get? distribution-records { ip-id: ip-id, period: period })))
    (if (is-some distribution-record)
        (get completed (unwrap-panic distribution-record))
        false
    )
  )
)

;; Get distribution details for an IP for a specific period
(define-read-only (get-distribution-details (ip-id (string-ascii 36)) (period uint))
  (let ((distribution-record (map-get? distribution-records { ip-id: ip-id, period: period })))
    (if (is-some distribution-record)
        (ok (unwrap-panic distribution-record))
        (err u6) ;; Distribution record not found
    )
  )
)

;; Change admin (admin only)
(define-public (set-admin (new-admin principal))
  (if (is-eq tx-sender (var-get admin))
      (begin
        (var-set admin new-admin)
        (ok true))
      (err u7) ;; Not authorized
  )
)

