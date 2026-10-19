-- Migration: 20261020011500_phase_2_through_6_sync
-- Reconciles database schema with Prisma schema after Phase 2-6 development
-- Incorporates all models, enums, fields, and constraints added across Phases 2 through 6.

-- CreateEnum
CREATE TYPE "ConversationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('BROADCAST', 'DRIP');

-- CreateEnum
CREATE TYPE "CampaignRecipientStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SUPPRESSED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'CLAIMED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('CONTACT_CREATED', 'LEAD_STAGE_CHANGED', 'CAMPAIGN_REPLY', 'CONSENT_REVOKED');

-- CreateEnum
CREATE TYPE "AutomationAction" AS ENUM ('CREATE_TASK', 'SEND_TEMPLATE', 'ASSIGN_DEPARTMENT', 'SUPPRESS_CONTACT');

-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'REJECTED';
ALTER TYPE "CampaignStatus" ADD VALUE 'FAILED';

-- AlterEnum
ALTER TYPE "MessageStatus" ADD VALUE 'LOCAL_SAVED';

-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'TODO';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "correlation_id" TEXT,
ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "campaign_recipients" ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "failed_at" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "read_at" TIMESTAMP(3),
ADD COLUMN     "recipient_status" "CampaignRecipientStatus" NOT NULL DEFAULT 'QUEUED',
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "wa_message_id" TEXT;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "approval_comment" TEXT,
ADD COLUMN     "approved_by_id" TEXT,
ADD COLUMN     "audience_segment_id" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "eligible_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "opt_out_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parameters" JSONB,
ADD COLUMN     "paused_at" TIMESTAMP(3),
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "replied_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "suppressed_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "type" "CampaignType" NOT NULL DEFAULT 'BROADCAST';

-- AlterTable
ALTER TABLE "consents" ADD COLUMN     "actor_id" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "company" TEXT,
ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "owner_id" TEXT,
ADD COLUMN     "source" TEXT DEFAULT 'DIRECT';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "last_inbound_message_at" TIMESTAMP(3),
ADD COLUMN     "priority" "ConversationPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "resolved_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "manager_id" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "description" TEXT,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "pipeline_stage_id" TEXT;

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#10b981',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_tags" (
    "contact_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("contact_id","tag_id")
);

-- CreateTable
CREATE TABLE "lead_pipeline_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT DEFAULT '#3b82f6',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_transfers" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "from_department_id" TEXT,
    "to_department_id" TEXT NOT NULL,
    "transferred_by_id" TEXT NOT NULL,
    "reason" TEXT,
    "handover_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_read_states" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_read_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_replies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "shortcut" TEXT,
    "department_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_segments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL,
    "department_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "marketing_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_approvals" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_send_jobs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_send_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_activity_logs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_automation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_type" "AutomationTrigger" NOT NULL,
    "trigger_config" JSONB,
    "conditions" JSONB,
    "action_type" "AutomationAction" NOT NULL,
    "action_config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "execution_details" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "lead_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lead_pipeline_stages_name_key" ON "lead_pipeline_stages"("name");

-- CreateIndex
CREATE INDEX "conversation_transfers_conversation_id_idx" ON "conversation_transfers"("conversation_id");

-- CreateIndex
CREATE INDEX "conversation_transfers_to_department_id_idx" ON "conversation_transfers"("to_department_id");

-- CreateIndex
CREATE INDEX "conversation_transfers_created_at_idx" ON "conversation_transfers"("created_at");

-- CreateIndex
CREATE INDEX "conversation_read_states_user_id_idx" ON "conversation_read_states"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_read_states_conversation_id_user_id_key" ON "conversation_read_states"("conversation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "quick_replies_shortcut_key" ON "quick_replies"("shortcut");

-- CreateIndex
CREATE INDEX "quick_replies_department_id_idx" ON "quick_replies"("department_id");

-- CreateIndex
CREATE INDEX "quick_replies_shortcut_idx" ON "quick_replies"("shortcut");

-- CreateIndex
CREATE INDEX "marketing_segments_department_id_idx" ON "marketing_segments"("department_id");

-- CreateIndex
CREATE INDEX "marketing_segments_created_by_id_idx" ON "marketing_segments"("created_by_id");

-- CreateIndex
CREATE INDEX "campaign_approvals_campaign_id_idx" ON "campaign_approvals"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_approvals_approver_id_idx" ON "campaign_approvals"("approver_id");

-- CreateIndex
CREATE INDEX "campaign_send_jobs_status_next_attempt_at_idx" ON "campaign_send_jobs"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "campaign_send_jobs_campaign_id_idx" ON "campaign_send_jobs"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_activity_logs_campaign_id_idx" ON "campaign_activity_logs"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_activity_logs_created_at_idx" ON "campaign_activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "marketing_automation_rules_trigger_type_is_active_idx" ON "marketing_automation_rules"("trigger_type", "is_active");

-- CreateIndex
CREATE INDEX "automation_executions_rule_id_idx" ON "automation_executions"("rule_id");

-- CreateIndex
CREATE INDEX "automation_executions_created_at_idx" ON "automation_executions"("created_at");

-- CreateIndex
CREATE INDEX "activity_logs_contact_id_idx" ON "activity_logs"("contact_id");

-- CreateIndex
CREATE INDEX "activity_logs_lead_id_idx" ON "activity_logs"("lead_id");

-- CreateIndex
CREATE INDEX "activity_logs_actor_id_idx" ON "activity_logs"("actor_id");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_department_id_idx" ON "audit_logs"("department_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "campaign_recipients_recipient_status_idx" ON "campaign_recipients"("recipient_status");

-- CreateIndex
CREATE INDEX "campaign_recipients_wa_message_id_idx" ON "campaign_recipients"("wa_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_recipients_campaign_id_contact_id_key" ON "campaign_recipients"("campaign_id", "contact_id");

-- CreateIndex
CREATE INDEX "campaigns_audience_segment_id_idx" ON "campaigns"("audience_segment_id");

-- CreateIndex
CREATE INDEX "campaigns_department_id_idx" ON "campaigns"("department_id");

-- CreateIndex
CREATE INDEX "campaigns_created_by_id_idx" ON "campaigns"("created_by_id");

-- CreateIndex
CREATE INDEX "campaigns_scheduled_at_idx" ON "campaigns"("scheduled_at");

-- CreateIndex
CREATE INDEX "contacts_department_id_idx" ON "contacts"("department_id");

-- CreateIndex
CREATE INDEX "contacts_owner_id_idx" ON "contacts"("owner_id");

-- CreateIndex
CREATE INDEX "conversations_priority_idx" ON "conversations"("priority");

-- CreateIndex
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");

-- CreateIndex
CREATE INDEX "leads_pipeline_stage_id_idx" ON "leads"("pipeline_stage_id");

-- CreateIndex
CREATE INDEX "leads_department_id_idx" ON "leads"("department_id");

-- CreateIndex
CREATE INDEX "notes_author_id_idx" ON "notes"("author_id");

-- CreateIndex
CREATE INDEX "tasks_creator_id_idx" ON "tasks"("creator_id");

-- CreateIndex
CREATE INDEX "tasks_contact_id_idx" ON "tasks"("contact_id");

-- CreateIndex
CREATE INDEX "tasks_lead_id_idx" ON "tasks"("lead_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipeline_stage_id_fkey" FOREIGN KEY ("pipeline_stage_id") REFERENCES "lead_pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_transfers" ADD CONSTRAINT "conversation_transfers_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_transfers" ADD CONSTRAINT "conversation_transfers_from_department_id_fkey" FOREIGN KEY ("from_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_transfers" ADD CONSTRAINT "conversation_transfers_to_department_id_fkey" FOREIGN KEY ("to_department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_transfers" ADD CONSTRAINT "conversation_transfers_transferred_by_id_fkey" FOREIGN KEY ("transferred_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_read_states" ADD CONSTRAINT "conversation_read_states_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_read_states" ADD CONSTRAINT "conversation_read_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_segments" ADD CONSTRAINT "marketing_segments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_segments" ADD CONSTRAINT "marketing_segments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_audience_segment_id_fkey" FOREIGN KEY ("audience_segment_id") REFERENCES "marketing_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_approvals" ADD CONSTRAINT "campaign_approvals_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_approvals" ADD CONSTRAINT "campaign_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_send_jobs" ADD CONSTRAINT "campaign_send_jobs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_send_jobs" ADD CONSTRAINT "campaign_send_jobs_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "campaign_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_activity_logs" ADD CONSTRAINT "campaign_activity_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "marketing_automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
