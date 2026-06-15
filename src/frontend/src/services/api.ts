const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "http://apiqlkt.chuavanduc.vn/api";

function getCurrentUserId(): number {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed.id;
    }
  } catch {
    // ignore
  }
  return 1; // fallback default
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const userId = getCurrentUserId();
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(userId),
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = "Đã xảy ra lỗi hệ thống.";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: string;
  active: boolean;
}

export interface Course {
  id: number;
  name: string;
  fromdate: string;
  todate: string;
  participantCount: number;
}

export interface Area {
  id: number;
  name: string;
  description?: string;
  rows: number;
  cols: number;
  createdAt?: string;
  createdBy?: number;
}

export interface MemberCourseHistory {
  courseId: number;
  courseName: string;
  fromdate?: string;
  todate?: string;
  dayAttend?: number;
  actualDays?: number;
}

export interface Member {
  id: number;
  uniqueId?: number;
  code?: string;
  name: string;
  otherName?: string;
  yearOfBirth?: number;
  gender?: string;
  phone?: string;
  otherPhone?: string;
  relativePhone?: string;
  identityImage?: string;
  joinedCoursesCount: number;
  courseHistory?: MemberCourseHistory[];
}

export interface Bed {
  id: number;
  areaId?: number;
  areaName?: string;
  code: string;
  description?: string;
  active: boolean;
  rowNumber?: number;
  orderNumber?: number;
  type?: string;
  currentMemberId?: number;
  currentMemberName?: string;
  isOccupied: boolean;
}

export interface Registration {
  courseId: number;
  courseName: string;
  memberId: number;
  memberName: string;
  memberCode?: string;
  memberOtherName?: string;
  bedId: number;
  bedCode: string;
  areaId?: number;
  areaName?: string;
  dayAttend?: number;
  fromdate?: string;
  todate?: string;
  description?: string;
  recievePhone?: boolean;
  recieveIdentity?: boolean;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}

export interface Event {
  id: number;
  name: string;
  fromDate: string; // e.g. "15/01"
  toDate: string;   // e.g. "15/01"
  isActive: boolean;
  createdAt?: string;
  createdBy?: number;
}


export const apiService = {
  // Auth
  auth: {
    login: (username: string, password: string) =>
      request<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    seed: () =>
      request<{ message: string }>("/auth/seed", {
        method: "POST",
      }),
  },

  // Users
  users: {
    getAll: () => request<User[]>("/users"),
    getById: (id: number) => request<User>(`/users/${id}`),
    create: (data: Omit<User, "id"> & { password?: string }) =>
      request<User>("/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<User> & { password?: string }) =>
      request<void>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/users/${id}`, {
        method: "DELETE",
      }),
  },

  // Courses
  courses: {
    getAll: () => request<Course[]>("/courses"),
    getById: (id: number) => request<Course>(`/courses/${id}`),
    create: (data: Omit<Course, "id" | "participantCount">) =>
      request<Course>("/courses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Omit<Course, "id" | "participantCount">) =>
      request<void>(`/courses/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/courses/${id}`, {
        method: "DELETE",
      }),
  },

  // Areas
  areas: {
    getAll: () => request<Area[]>("/areas"),
    getById: (id: number) => request<Area>(`/areas/${id}`),
    create: (data: Omit<Area, "id">) =>
      request<Area>("/areas", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Omit<Area, "id">) =>
      request<void>(`/areas/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/areas/${id}`, {
        method: "DELETE",
      }),
  },

  // Members
  members: {
    getAll: () => request<Member[]>("/members"),
    getById: (id: number) => request<Member>(`/members/${id}`),
    create: (data: Omit<Member, "id" | "joinedCoursesCount">) =>
      request<Member>("/members", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Omit<Member, "id" | "joinedCoursesCount">) =>
      request<void>(`/members/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/members/${id}`, {
        method: "DELETE",
      }),
  },

  // Beds
  beds: {
    getAll: (courseId?: number) =>
      request<Bed[]>(`/beds${courseId ? `?courseId=${courseId}` : ""}`),
    getById: (id: number) => request<Bed>(`/beds/${id}`),
    create: (data: Omit<Bed, "id" | "areaName" | "isOccupied" | "currentMemberId" | "currentMemberName">) =>
      request<Bed>("/beds", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Omit<Bed, "id" | "areaName" | "isOccupied" | "currentMemberId" | "currentMemberName">) =>
      request<void>(`/beds/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    batchUpdatePositions: (updates: { id: number; rowNumber: number; orderNumber: number }[]) =>
      request<{ message: string }>("/beds/batch-update-positions", {
        method: "POST",
        body: JSON.stringify(updates),
      }),
    delete: (id: number) =>
      request<void>(`/beds/${id}`, {
        method: "DELETE",
      }),
  },

  // Registrations
  registrations: {
    getAll: (courseId?: number) =>
      request<Registration[]>(`/registrations${courseId ? `?courseId=${courseId}` : ""}`),
    getById: (memberId: number, courseId: number) =>
      request<Registration>(`/registrations/${memberId}/${courseId}`),
    create: (data: Omit<Registration, "courseName" | "memberName" | "bedCode" | "areaId" | "areaName" | "createdAt" | "createdBy">) =>
      request<Registration>("/registrations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (memberId: number, courseId: number, data: Omit<Registration, "courseName" | "memberName" | "bedCode" | "areaId" | "areaName" | "createdAt" | "createdBy">) =>
      request<void>(`/registrations/${memberId}/${courseId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (memberId: number, courseId: number) =>
      request<void>(`/registrations/${memberId}/${courseId}`, {
        method: "DELETE",
      }),
  },

  // Events
  events: {
    getAll: () => request<Event[]>("/events"),
    getById: (id: number) => request<Event>(`/events/${id}`),
    create: (data: Omit<Event, "id">) =>
      request<Event>("/events", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Omit<Event, "id">) =>
      request<void>(`/events/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/events/${id}`, {
        method: "DELETE",
      }),
  },
};
