"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  return profile;
}

export async function getTasks(status?: "PENDING" | "COMPLETED" | "OVERDUE" | "CANCELLED") {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return redirect("/login");

  let query = supabase
    .from("tasks")
    .select(`
      *,
      lead:leads(id, name, phone, email),
      assigned_to:users!tasks_assigned_to_id_fkey(id, name)
    `)
    .eq("company_id", profile.company_id);

  // If agent, only show their own tasks
  if (profile.role === "AGENT") {
    query = query.eq("assigned_to_id", profile.id);
  }

  query = query.order("due_at", { ascending: true });

  if (status) {
    if (status === "OVERDUE") {
      query = query
        .eq("status", "PENDING")
        .lt("due_at", new Date().toISOString());
    } else {
      query = query.eq("status", status);
    }
  }

  const { data: tasks, error } = await query;
  if (error) {
    console.error("getTasks error:", error);
    return [];
  }

  return tasks || [];
}

export async function createTask(data: {
  lead_id: string;
  type: string;
  due_at: string;
  notes?: string;
  assigned_to_id?: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      ...data,
      company_id: profile.company_id,
      created_by_id: profile.id,
      assigned_to_id: data.assigned_to_id || profile.id,
      status: "PENDING",
    })
    .select()
    .single();

  if (error) {
    console.error("createTask error:", error);
    return { error: "Failed to create task" };
  }

  // Log activity
  await supabase.from("activities").insert({
    lead_id: data.lead_id,
    user_id: profile.id,
    type: "TASK_CREATED",
    description: `Created task: ${data.type} — Due on ${new Date(data.due_at).toLocaleString()}`,
    metadata: { task_id: task.id },
  });

  revalidatePath("/tasks");
  revalidatePath(`/leads/${data.lead_id}`);
  return { success: true, task };
}

export async function updateTaskStatus(taskId: string, status: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ 
      status, 
      completed_at: status === "COMPLETED" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString() 
    })
    .eq("id", taskId)
    .eq("company_id", profile.company_id)
    .select()
    .single();

  if (error) {
    console.error("updateTaskStatus error:", error);
    return { error: "Failed to update task" };
  }

  // Log activity
  await supabase.from("activities").insert({
    lead_id: task.lead_id,
    user_id: profile.id,
    type: status === "COMPLETED" ? "TASK_COMPLETED" : "SYSTEM",
    description: `${status === "COMPLETED" ? "Completed" : "Updated"} task: ${task.type}`,
    metadata: { task_id: taskId, status },
  });

  revalidatePath("/tasks");
  revalidatePath(`/leads/${task.lead_id}`);
  return { success: true };
}

export async function getLeadTasks(leadId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(`
      *,
      assigned_to:users!tasks_assigned_to_id_fkey(id, name)
    `)
    .eq("lead_id", leadId)
    .eq("company_id", profile.company_id)
    .order("due_at", { ascending: true });

  if (error) {
    console.error("getLeadTasks error:", error);
    return [];
  }

  return tasks || [];
}

export async function getMyLeads() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from("leads")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name", { ascending: true })
    .limit(500);

  // Agents only see their own leads
  if (profile.role === "AGENT") {
    query = query.eq("assigned_to_id", profile.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getMyLeads error:", error);
    return [];
  }
  return data || [];
}
