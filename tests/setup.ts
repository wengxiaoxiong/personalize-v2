/**
 * Test setup - Mocks Next.js dependencies for testing
 */

// Mock next/cache
const mockRevalidatePath = (path: string) => {
  // No-op in tests
};

// Mock next/headers
const mockCookies = async () => {
  const cookieStore = new Map<string, string>();

  // Set a default test user
  cookieStore.set("auth-user", "test@example.com");

  return {
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value ? { value } : undefined;
    },
    set: (name: string, value: string, options?: any) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  };
};

// Apply mocks to module cache
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string) {
  if (id === 'next/cache') {
    return { revalidatePath: mockRevalidatePath };
  }
  if (id === 'next/headers') {
    return { cookies: mockCookies };
  }
  return originalRequire.apply(this, arguments);
};

console.log('✅ Test setup: Next.js mocks initialized');
