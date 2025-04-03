import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity VM environment
const mockVM = {
  txSender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  blockHeight: 100,
  
  // Mock maps
  rightsHolders: new Map(),
  verificationRequests: new Map(),
  
  // Mock contract calls
  registerIp(ipId, title) {
    const key = JSON.stringify({ "ip-id": ipId })
    if (this.rightsHolders.has(key)) {
      return { err: 1 }
    }
    
    this.verificationRequests.set(key, {
      requester: this.txSender,
      title,
      "creation-date": this.blockHeight,
      status: "pending",
    })
    
    return { ok: true }
  },
  
  verifyIp(ipId) {
    const key = JSON.stringify({ "ip-id": ipId })
    if (this.txSender !== this.admin) {
      return { err: 2 }
    }
    
    const request = this.verificationRequests.get(key)
    if (!request || request.status !== "pending") {
      return { err: 2 }
    }
    
    this.rightsHolders.set(key, {
      owner: request.requester,
      title: request.title,
      "creation-date": request["creation-date"],
      verified: true,
    })
    
    this.verificationRequests.set(key, {
      ...request,
      status: "approved",
    })
    
    return { ok: true }
  },
  
  isVerified(ipId) {
    const key = JSON.stringify({ "ip-id": ipId })
    const ipData = this.rightsHolders.get(key)
    
    return ipData ? ipData.verified : false
  },
  
  getIpOwner(ipId) {
    const key = JSON.stringify({ "ip-id": ipId })
    const ipData = this.rightsHolders.get(key)
    
    return ipData ? { ok: ipData.owner } : { err: 5 }
  },
}

describe("Rights Holder Verification Contract", () => {
  beforeEach(() => {
    // Reset the mock VM state
    mockVM.txSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockVM.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockVM.rightsHolders.clear()
    mockVM.verificationRequests.clear()
  })
  
  it("should register a new IP", () => {
    const ipId = "ip-123"
    const result = mockVM.registerIp(ipId, "My Awesome IP")
    expect(result).toEqual({ ok: true })
    
    const key = JSON.stringify({ "ip-id": ipId })
    const request = mockVM.verificationRequests.get(key)
    expect(request).toBeDefined()
    expect(request.status).toBe("pending")
    expect(request.title).toBe("My Awesome IP")
  })
  
  it("should verify an IP as admin", () => {
    // Register an IP
    const ipId = "ip-123"
    mockVM.registerIp(ipId, "My Awesome IP")
    
    // Verify the IP
    const result = mockVM.verifyIp(ipId)
    expect(result).toEqual({ ok: true })
    
    // Check that the IP is now verified
    const isVerified = mockVM.isVerified(ipId)
    expect(isVerified).toBe(true)
  })
  
  it("should not verify an IP as non-admin", () => {
    // Register an IP
    const ipId = "ip-123"
    mockVM.registerIp(ipId, "My Awesome IP")
    
    // Change the sender to a non-admin
    mockVM.txSender = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    
    // Try to verify the IP
    const result = mockVM.verifyIp(ipId)
    expect(result).toEqual({ err: 2 })
  })
})

