/**
 * Tipos de la base de datos.
 * Reflejan supabase/migrations/20261111120000_initial_schema.sql.
 * Cuando el esquema esté aplicado, se pueden regenerar con:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */
import type {
  Budget,
  Experience,
  ProjectStatus,
  Stage,
  TaskStatus,
  WeeklyHours,
} from '@/domain/types';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          active_project_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { id: string; display_name?: string | null; active_project_id?: string | null };
        Update: { display_name?: string | null; active_project_id?: string | null };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          path_id: string;
          name: string;
          goal: string | null;
          status: ProjectStatus;
          experience: Experience;
          budget: Budget;
          weekly_hours: WeeklyHours;
          stage: Stage;
          path_answers: Json;
          content_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          path_id: string;
          name: string;
          goal?: string | null;
          status?: ProjectStatus;
          experience: Experience;
          budget: Budget;
          weekly_hours: WeeklyHours;
          stage: Stage;
          path_answers?: Json;
          content_version?: number;
        };
        Update: {
          name?: string;
          goal?: string | null;
          status?: ProjectStatus;
        };
        Relationships: [];
      };
      project_tasks: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          template_key: string;
          phase_key: string;
          position: number;
          status: TaskStatus;
          notes: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id: string;
          template_key: string;
          phase_key: string;
          position: number;
          status?: TaskStatus;
          notes?: string | null;
        };
        Update: { status?: TaskStatus; notes?: string | null };
        Relationships: [];
      };
      metric_entries: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          metric_key: string;
          value: number;
          recorded_on: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          metric_key: string;
          value: number;
          recorded_on?: string;
          note?: string | null;
        };
        Update: { value?: number; recorded_on?: string; note?: string | null };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_project_with_tasks: {
        Args: {
          p_path_id: string;
          p_name: string;
          p_goal: string;
          p_experience: Experience;
          p_budget: Budget;
          p_weekly_hours: WeeklyHours;
          p_stage: Stage;
          p_path_answers: Json;
          p_content_version: number;
          p_tasks: Json;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

type Tables = Database['public']['Tables'];
export type ProfileRow = Tables['profiles']['Row'];
export type ProjectRow = Tables['projects']['Row'];
export type TaskRow = Tables['project_tasks']['Row'];
export type MetricEntryRow = Tables['metric_entries']['Row'];
