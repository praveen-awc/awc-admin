import type { AuditActor } from "@/components/ui/AuditLine";
/** Mirrors awc-backend/src/models/Job.ts */
export interface JobListItem {
  _id: string;
  jobCode: string;
  title: string;
  designation: string;
  location: string;
  experience: string;
  skills: string[];
  workModel: string;
  employmentType: string;
  isActive: boolean;
  postedAt: string;
  createdAt: string;
  /**
   * Populated by the admin detail endpoints. Absent on records written
   * before the field existed -- AuditLine renders those without a name.
   */
  createdBy?: AuditActor | string | null;
  updatedBy?: AuditActor | string | null;
  updatedAt: string;
  /** Added by the list endpoint via one grouped aggregation. */
  applicationCount: number;
}

export interface Job extends Omit<JobListItem, "applicationCount"> {
  totalExperience: string;
  function: string;
  qualification: string;
  joiningAvailability: string;
  description: string;
  keyResponsibilities: string[];
  mandatorySkills?: string[];
  requirements?: string[];
}

export interface JobInput {
  jobCode: string;
  title: string;
  designation: string;
  location: string;
  experience: string;
  totalExperience: string;
  function: string;
  skills: string[];
  workModel: string;
  employmentType: string;
  qualification: string;
  joiningAvailability: string;
  description: string;
  keyResponsibilities: string[];
  mandatorySkills: string[];
  requirements: string[];
  isActive: boolean;
  /** See BlogInput.expectedUpdatedAt -- the lost-update guard. */
  expectedUpdatedAt?: string | null;
}
