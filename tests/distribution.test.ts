import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity VM environment
const mockVM = {
  txSender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  blockHeight: 100,
  
  // Mock maps
  stakeholders: new Map(),
  distributionRecords: new Map(),
  ipOwners: new Map(),
  revenueData: new Map(),
  
  // Mock contract calls
  registerIpOwner(ipId, owner) {
    if (this.txSender !== this.admin) {
      return { err: 1 }
    }
    
    const key = JSON.stringify({ "ip-id": ipId })
    this.ipOwners.set(key, { owner })
    
    return { ok: true }
  },
  
  recordRevenue(ipId, period, amount) {
    if (this.txSender !== this.admin) {
      return { err: 2 }
    }
    
    const key = JSON.stringify({ "ip-id": ipId, period: period })
    this.revenueData.set(key, { amount })
    
    return { ok: true }
  },
  
  addStakeholder(ipId, stakeholder, share) {
    const key = JSON.stringify({ "ip-id": ipId })
    const ownerData = this.ipOwners.get(key)
    
    if (!ownerData || ownerData.owner !== this.txSender) {
      return { err: 3 }
    }
    
    const stakeholderKey = JSON.stringify({ "ip-id": ipId, stakeholder: stakeholder })
    this.stakeholders.set(stakeholderKey, { share })
    
    return { ok: true }
  },
  
  getStakeholderShare(ipId, stakeholder) {
    const key = JSON.stringify({ "ip-id": ipId, stakeholder: stakeholder })
    const shareData = this.stakeholders.get(key)
    
    return shareData ? { ok: shareData.share } : { ok: 0 }
  },
  
  distributeRevenue(ipId, period) {
    const revenueKey = JSON.stringify({ "ip-id": ipId, period: period })
    const revenueEntry = this.revenueData.get(revenueKey)
    
    const distributionKey = JSON.stringify({ "ip-id": ipId, period: period })
    const distributionRecord = this.distributionRecords.get(distributionKey)
    
    if (!revenueEntry || revenueEntry.amount === 0 || (distributionRecord && distributionRecord.completed)) {
      return { err: 5 }
    }
    
    this.distributionRecords.set(distributionKey, {
      "total-distributed": revenueEntry.amount,
      "distribution-date": this.blockHeight,
      completed: true,
    })
    
    return { ok: true }
  },
  
  isRevenueDistributed(ipId, period) {
    const key = JSON.stringify({ "ip-id": ipId, period: period })
    const record = this.distributionRecords.get(key)
    
    return record ? record.completed : false
  },
}

describe("Distribution Contract", () => {
  beforeEach(() => {
    // Reset the mock VM state
    mockVM.txSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockVM.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockVM.stakeholders.clear()
    mockVM.distributionRecords.clear()
    mockVM.ipOwners.clear()
    mockVM.revenueData.clear()
  })
  
  it("should register an IP owner as admin", () => {
    const owner = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = mockVM.registerIpOwner("ip-123", owner)
    expect(result).toEqual({ ok: true })
    
    const key = JSON.stringify({ "ip-id": "ip-123" })
    const ownerData = mockVM.ipOwners.get(key)
    expect(ownerData).toBeDefined()
    expect(ownerData.owner).toBe(owner)
  })
  
  it("should add a stakeholder as the IP owner", () => {
    // Register IP owner
    const owner = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockVM.registerIpOwner("ip-123", owner)
    
    // Change sender to the IP owner
    mockVM.txSender = owner
    
    // Add stakeholder
    const stakeholder = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = mockVM.addStakeholder("ip-123", stakeholder, 2000)
    expect(result).toEqual({ ok: true })
    
    // Check stakeholder share
    const shareResult = mockVM.getStakeholderShare("ip-123", stakeholder)
    expect(shareResult).toEqual({ ok: 2000 })
  })
  
  it("should distribute revenue", () => {
    // Record revenue
    mockVM.recordRevenue("ip-123", 1, 1000)
    
    // Distribute revenue
    const result = mockVM.distributeRevenue("ip-123", 1)
    expect(result).toEqual({ ok: true })
    
    // Check if revenue is distributed
    const isDistributed = mockVM.isRevenueDistributed("ip-123", 1)
    expect(isDistributed).toBe(true)
  })
  
  it("should not distribute revenue if already distributed", () => {
    // Record revenue
    mockVM.recordRevenue("ip-123", 1, 1000)
    
    // Distribute revenue
    mockVM.distributeRevenue("ip-123", 1)
    
    // Try to distribute again
    const result = mockVM.distributeRevenue("ip-123", 1)
    expect(result).toEqual({ err: 5 })
  })
})

