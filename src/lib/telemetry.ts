import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';

export interface DeviceTelemetry {
  ip: string;
  fingerprint: string;
  country: string;
  city: string;
  region: string;
  isp: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  deviceName: string;
  os: string;
  browser: string;
  screenResolution: string;
  userAgent: string;
  language: string;
  platform: string;
  cores?: number;
  memory?: number;
  touchSupport: boolean;
  online: boolean;
  timezone: string;
  referrer: string;
}

// Generate persistent canvas & client hardware fingerprint
export function generateClientFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 50;
    
    let canvasData = '';
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial', sans-serif";
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = '#EDEDED';
      ctx.fillText('DK-X-SYSTEM-ID-9923', 4, 17);
      canvasData = canvas.toDataURL();
    }

    const nav = window.navigator as any;
    const rawTokens = [
      canvasData.slice(30, 90),
      nav.userAgent || '',
      nav.language || '',
      nav.hardwareConcurrency || 'x',
      nav.deviceMemory || 'y',
      screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    ].join('###');

    // Simple FNV-1a 32-bit to hex hash
    let hash = 2166136261;
    for (let i = 0; i < rawTokens.length; i++) {
      hash ^= rawTokens.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    return `fp_${hex}_${screen.width}x${screen.height}`;
  } catch {
    return `fp_fallback_${Date.now()}`;
  }
}

// Detect operating system accurately
function detectOS(ua: string): string {
  if (/Windows NT 10.0/i.test(ua)) return 'Windows 10/11';
  if (/Windows NT 6.3/i.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6.1/i.test(ua)) return 'Windows 7';
  if (/Macintosh; Intel Mac OS X 10[._](\d+)/i.test(ua)) {
    const match = ua.match(/Mac OS X 10[._](\d+)/i);
    return match ? `macOS 10.${match[1]}` : 'macOS';
  }
  if (/Macintosh; Intel Mac OS X 1[1-9]/i.test(ua) || /Macintosh; Intel Mac OS X [2-9]\d/i.test(ua)) return 'macOS Modern';
  if (/iPhone OS (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/iPhone OS (\d+[._]\d+)/i);
    return `iOS ${match ? match[1].replace('_', '.') : ''}`;
  }
  if (/iPad.*OS (\d+[._]\d+)/i.test(ua)) return 'iPadOS';
  if (/Android (\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/i);
    return `Android ${match ? match[1] : ''}`;
  }
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown OS';
}

// Detect browser accurately
function detectBrowser(ua: string): string {
  if (/Edg\/(\d+[\.\d]*)/i.test(ua)) {
    const m = ua.match(/Edg\/(\d+[\.\d]*)/i);
    return `Edge ${m ? m[1].split('.')[0] : ''}`;
  }
  if (/Chrome\/(\d+[\.\d]*)/i.test(ua) && !/Edg/i.test(ua)) {
    const m = ua.match(/Chrome\/(\d+[\.\d]*)/i);
    return `Chrome ${m ? m[1].split('.')[0] : ''}`;
  }
  if (/Firefox\/(\d+[\.\d]*)/i.test(ua)) {
    const m = ua.match(/Firefox\/(\d+[\.\d]*)/i);
    return `Firefox ${m ? m[1].split('.')[0] : ''}`;
  }
  if (/Safari\/(\d+[\.\d]*)/i.test(ua) && !/Chrome/i.test(ua)) {
    const m = ua.match(/Version\/(\d+[\.\d]*)/i);
    return `Safari ${m ? m[1].split('.')[0] : ''}`;
  }
  if (/Opera|OPR\/(\d+[\.\d]*)/i.test(ua)) return 'Opera';
  return 'Browser';
}

// Detect device model & form factor
function detectDeviceType(): 'Desktop' | 'Mobile' | 'Tablet' {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
}

function detectDeviceName(ua: string): string {
  if (/iPhone/i.test(ua)) return 'Apple iPhone';
  if (/iPad/i.test(ua)) return 'Apple iPad';
  if (/Macintosh/i.test(ua)) return 'Apple Mac';
  if (/Samsung|SM-|GT-/i.test(ua)) return 'Samsung Device';
  if (/Pixel/i.test(ua)) return 'Google Pixel';
  if (/Xiaomi|Redmi/i.test(ua)) return 'Xiaomi';
  if (/OnePlus/i.test(ua)) return 'OnePlus';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux Machine';
  return 'Standard Device';
}

// Fetch IP and Geo Location details using trusted public API
export async function fetchClientTelemetry(): Promise<DeviceTelemetry> {
  const ua = navigator.userAgent || '';
  const fingerprint = generateClientFingerprint();
  const nav = window.navigator as any;

  let ip = 'Unknown';
  let country = 'Unknown';
  let city = 'Unknown';
  let region = 'Unknown';
  let isp = 'Unknown';

  // Primary attempt: ipapi.co or freeipapi
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      ip = data.ip || 'Unknown';
      country = data.country_name || data.country || 'Unknown';
      city = data.city || 'Unknown';
      region = data.region || 'Unknown';
      isp = data.org || 'Unknown';
    }
  } catch {
    // Secondary fallback attempt: ipify
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      if (res.ok) {
        const d = await res.json();
        ip = d.ip || 'Unknown';
      }
    } catch {
      // Offline or network block
    }
  }

  // Backup fallback IP in localStorage for consistent device locking in development
  if (!ip || ip === 'Unknown') {
    let localIp = localStorage.getItem('dkx_detected_ip');
    if (!localIp) {
      localIp = `local_${Math.floor(Math.random() * 899 + 100)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      localStorage.setItem('dkx_detected_ip', localIp);
    }
    ip = localIp;
  } else {
    localStorage.setItem('dkx_detected_ip', ip);
  }

  const deviceType = detectDeviceType();
  const deviceName = detectDeviceName(ua);
  const os = detectOS(ua);
  const browser = detectBrowser(ua);
  const screenResolution = `${window.screen.width}×${window.screen.height} (${window.devicePixelRatio}x)`;
  const language = navigator.language || 'bn-BD';
  const platform = navigator.platform || 'Unknown';
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';

  return {
    ip,
    fingerprint,
    country,
    city,
    region,
    isp,
    deviceType,
    deviceName,
    os,
    browser,
    screenResolution,
    userAgent: ua.slice(0, 500),
    language,
    platform,
    cores: nav.hardwareConcurrency,
    memory: nav.deviceMemory,
    touchSupport,
    online: navigator.onLine,
    timezone,
    referrer: document.referrer || 'Direct Entry'
  };
}

// Convert IP to safe Firestore Document ID (replace dots/colons)
export function sanitizeDocId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 100);
}

// Record or update visitor in Firestore
export async function recordVisitorTelemetry(telemetry: DeviceTelemetry): Promise<void> {
  const visitorId = sanitizeDocId(`vis_${telemetry.ip}`);
  const path = `visitors/${visitorId}`;

  try {
    const visitorRef = doc(db, 'visitors', visitorId);
    const existingSnap = await getDoc(visitorRef);

    const now = new Date().toISOString();

    if (existingSnap.exists()) {
      // Update existing record
      await updateDoc(visitorRef, {
        visitCount: increment(1),
        lastVisitedAt: now,
      });
    } else {
      // Create new record
      await setDoc(visitorRef, {
        ip: telemetry.ip,
        fingerprint: telemetry.fingerprint,
        country: telemetry.country,
        city: telemetry.city,
        region: telemetry.region,
        isp: telemetry.isp,
        deviceType: telemetry.deviceType,
        deviceName: telemetry.deviceName,
        os: telemetry.os,
        browser: telemetry.browser,
        screenResolution: telemetry.screenResolution,
        userAgent: telemetry.userAgent,
        hasSubmittedMessage: false,
        visitCount: 1,
        createdAt: now,
        lastVisitedAt: now
      });
    }
  } catch (error) {
    console.warn('Could not record visitor telemetry:', error);
  }
}

// Check if this visitor is locked from submitting (already sent a message)
export async function checkSubmissionLock(ip: string, fingerprint: string): Promise<{
  isLocked: boolean;
  lockedReason?: string;
  lockedAt?: string;
}> {
  // Check localStorage first
  const localLock = localStorage.getItem('dkx_msg_lock');
  if (localLock) {
    try {
      const parsed = JSON.parse(localLock);
      return { isLocked: true, lockedReason: 'Local storage record', lockedAt: parsed.lockedAt };
    } catch {
      // continue to remote check
    }
  }

  // Check remote Firestore locks by IP
  const ipLockId = sanitizeDocId(`lock_ip_${ip}`);
  try {
    const ipDoc = await getDoc(doc(db, 'locks', ipLockId));
    if (ipDoc.exists()) {
      const data = ipDoc.data();
      localStorage.setItem('dkx_msg_lock', JSON.stringify({ ip, lockedAt: data.createdAt }));
      return { isLocked: true, lockedReason: 'IP match', lockedAt: data.createdAt };
    }
  } catch (e) {
    // If permission or offline, handle gracefully
    console.warn('Check IP lock error', e);
  }

  // Check remote Firestore locks by Fingerprint
  const fpLockId = sanitizeDocId(`lock_fp_${fingerprint}`);
  try {
    const fpDoc = await getDoc(doc(db, 'locks', fpLockId));
    if (fpDoc.exists()) {
      const data = fpDoc.data();
      localStorage.setItem('dkx_msg_lock', JSON.stringify({ ip, lockedAt: data.createdAt }));
      return { isLocked: true, lockedReason: 'Device fingerprint match', lockedAt: data.createdAt };
    }
  } catch (e) {
    console.warn('Check FP lock error', e);
  }

  // Check visitor record
  const visitorId = sanitizeDocId(`vis_${ip}`);
  try {
    const visDoc = await getDoc(doc(db, 'visitors', visitorId));
    if (visDoc.exists() && visDoc.data().hasSubmittedMessage) {
      return { isLocked: true, lockedReason: 'Visitor record submitted' };
    }
  } catch {
    //
  }

  return { isLocked: false };
}

// Submit single message and enforce strict locks
export async function submitOneTimeMessage(payload: {
  name: string;
  email: string;
  telegram?: string;
  message: string;
  telemetry: DeviceTelemetry;
}): Promise<{ success: boolean; messageId: string }> {
  const { name, email, telegram, message, telemetry } = payload;
  const now = new Date().toISOString();
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Double check lock before writing
  const lockStatus = await checkSubmissionLock(telemetry.ip, telemetry.fingerprint);
  if (lockStatus.isLocked) {
    throw new Error('আপনি ইতিমধ্যে একটি বার্তা পাঠিয়েছেন। প্রতিটি ডিভাইস ও আইপি থেকে কেবল একবারই বার্তা পাঠানো অনুমোদিত।');
  }

  const messageDoc: Record<string, any> = {
    name: name.trim().slice(0, 120),
    email: email.trim().slice(0, 150),
    message: message.trim().slice(0, 2000),
    ip: telemetry.ip.slice(0, 64),
    fingerprint: telemetry.fingerprint.slice(0, 128),
    location: `${telemetry.city}, ${telemetry.country}`.slice(0, 150),
    deviceSummary: `${telemetry.deviceName} · ${telemetry.os} · ${telemetry.browser}`.slice(0, 200),
    status: 'unread',
    createdAt: now
  };

  if (telegram && telegram.trim()) {
    messageDoc.telegram = telegram.trim().slice(0, 100);
  }

  const pathForWrite = `messages/${messageId}`;
  try {
    // Write message
    await setDoc(doc(db, 'messages', messageId), messageDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, pathForWrite);
  }

  // Create submission locks for IP and Fingerprint
  try {
    const ipLockId = sanitizeDocId(`lock_ip_${telemetry.ip}`);
    await setDoc(doc(db, 'locks', ipLockId), {
      identifier: `ip_${telemetry.ip}`,
      messageId: messageId,
      ip: telemetry.ip,
      createdAt: now
    });
  } catch (e) {
    console.warn('Could not write IP lock:', e);
  }

  try {
    const fpLockId = sanitizeDocId(`lock_fp_${telemetry.fingerprint}`);
    await setDoc(doc(db, 'locks', fpLockId), {
      identifier: `fp_${telemetry.fingerprint}`,
      messageId: messageId,
      ip: telemetry.ip,
      createdAt: now
    });
  } catch (e) {
    console.warn('Could not write FP lock:', e);
  }

  // Update visitor record to mark hasSubmittedMessage
  try {
    const visitorId = sanitizeDocId(`vis_${telemetry.ip}`);
    await updateDoc(doc(db, 'visitors', visitorId), {
      hasSubmittedMessage: true
    });
  } catch (e) {
    console.warn('Could not update visitor submission flag:', e);
  }

  // Set localStorage backup lock
  localStorage.setItem('dkx_msg_lock', JSON.stringify({
    ip: telemetry.ip,
    messageId,
    lockedAt: now
  }));

  return { success: true, messageId };
}
