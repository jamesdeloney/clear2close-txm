-- Clear2Close Transaction Management Schema
-- Run with: npm run migrate

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_address TEXT NOT NULL,
  city TEXT,
  state TEXT DEFAULT 'TX',
  zip TEXT,
  mls_number TEXT,
  transaction_type TEXT CHECK (transaction_type IN ('listing', 'buyer')),
  current_stage TEXT DEFAULT 'pre_listing',
  seller_name TEXT,
  seller_email TEXT,
  seller_phone TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_agent_name TEXT,
  buyer_agent_email TEXT,
  title_company TEXT,
  title_contact_email TEXT,
  lender_name TEXT,
  lender_email TEXT,
  list_price NUMERIC,
  contract_price NUMERIC,
  earnest_money NUMERIC,
  option_fee NUMERIC,
  option_period_end DATE,
  financing_deadline DATE,
  closing_date DATE,
  possession_date DATE,
  list_date DATE,
  contract_date DATE,
  drive_folder_id TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key TEXT UNIQUE NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  task_name TEXT NOT NULL,
  task_description TEXT,
  assigned_to TEXT CHECK (assigned_to IN ('agent', 'seller', 'buyer', 'title', 'lender')),
  due_offset_days INTEGER,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  notes TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_key TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  send_offset_days INTEGER DEFAULT 0,
  send_to TEXT[],
  attach_document_keys TEXT[],
  include_links JSONB,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id),
  template_key TEXT,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  attachments JSONB,
  links JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  gmail_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key TEXT UNIQUE NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('template', 'transaction_doc', 'resource')),
  stage_key TEXT,
  drive_file_id TEXT,
  drive_folder_id TEXT,
  public_url TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER,
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ DEFAULT now(),
  transitioned_by TEXT,
  notes TEXT
);

-- Default task templates (not tied to a transaction — cloned per transaction)
CREATE TABLE IF NOT EXISTS default_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key TEXT NOT NULL,
  task_name TEXT NOT NULL,
  task_description TEXT,
  assigned_to TEXT CHECK (assigned_to IN ('agent', 'seller', 'buyer', 'title', 'lender')),
  due_offset_days INTEGER DEFAULT 0,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_stage ON transactions(current_stage);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_transaction ON workflow_tasks(transaction_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_transaction ON email_queue(transaction_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_stage_history_transaction ON stage_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_default_tasks_stage ON default_tasks(stage_key);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Workflow stages
INSERT INTO workflow_stages (stage_key, stage_name, stage_order, description) VALUES
  ('pre_listing', 'Pre-Listing', 1, 'Preparing the property for market — disclosures, photography, sign, lockbox, listing agreement.'),
  ('active_listing', 'Active Listing', 2, 'Property is live on MLS — showings, feedback, price strategy reviews.'),
  ('under_contract', 'Under Contract', 3, 'Accepted offer through closing — inspections, appraisal, financing, title work.'),
  ('closing', 'Closing', 4, 'Final steps — walkthrough, wire instructions, funding, key exchange.')
ON CONFLICT (stage_key) DO NOTHING;

-- Default tasks: Pre-Listing
INSERT INTO default_tasks (stage_key, task_name, task_description, assigned_to, due_offset_days, sort_order) VALUES
  ('pre_listing', 'Schedule listing appointment', 'Coordinate date and time for initial listing consultation with seller.', 'agent', 0, 1),
  ('pre_listing', 'Send seller pre-listing package', 'Email pre-listing packet with CMA, listing agreement, and disclosure forms.', 'agent', 0, 2),
  ('pre_listing', 'Confirm seller disclosure sent to SellerShield', 'Verify seller has received and started the SellerShield disclosure process.', 'agent', 1, 3),
  ('pre_listing', 'Order professional photography', 'Schedule photographer for listing photos, drone, and virtual tour.', 'agent', 3, 4),
  ('pre_listing', 'Order sign and lockbox', 'Request yard sign installation and Supra lockbox delivery.', 'agent', 3, 5),
  ('pre_listing', 'Verify HOA status and documents', 'Confirm HOA membership, obtain resale certificate and governing docs if applicable.', 'agent', 4, 6),
  ('pre_listing', 'Confirm title company selection', 'Verify which title company will handle closing and send contact info to all parties.', 'agent', 5, 7),
  ('pre_listing', 'Review and sign listing agreement via DocuSign', 'Seller to review, initial, and execute listing agreement electronically.', 'seller', 1, 8),
  ('pre_listing', 'Complete seller''s disclosure on SellerShield', 'Seller fills out all required property disclosure forms through SellerShield portal.', 'seller', 2, 9),
  ('pre_listing', 'Complete home prep checklist', 'Seller completes recommended staging, cleaning, and minor repairs before photography.', 'seller', 3, 10);

-- Default tasks: Active Listing
INSERT INTO default_tasks (stage_key, task_name, task_description, assigned_to, due_offset_days, sort_order) VALUES
  ('active_listing', 'Confirm MLS listing is live and accurate', 'Verify all MLS fields, photos, and remarks are correct and published.', 'agent', 0, 1),
  ('active_listing', 'Set up ShowingTime instructions', 'Configure showing instructions, lockbox code, and appointment requirements in ShowingTime.', 'agent', 0, 2),
  ('active_listing', 'Share listing link with seller', 'Send seller the live MLS link and any social media or marketing materials.', 'agent', 0, 3),
  ('active_listing', 'First week showing feedback review', 'Compile and review showing feedback from the first week on market with seller.', 'agent', 7, 4),
  ('active_listing', 'Price strategy review if no offers', 'If no offers received within 14 days, schedule a price adjustment discussion with seller.', 'agent', 14, 5);

-- Default tasks: Under Contract
INSERT INTO default_tasks (stage_key, task_name, task_description, assigned_to, due_offset_days, sort_order) VALUES
  ('under_contract', 'Deliver executed contract to all parties', 'Distribute fully executed contract to buyer agent, title company, and lender.', 'agent', 0, 1),
  ('under_contract', 'Confirm earnest money delivery to title', 'Verify buyer''s earnest money check or wire has been received by title company.', 'agent', 1, 2),
  ('under_contract', 'Confirm option fee delivered to seller', 'Verify option fee payment has been received by seller or seller''s agent.', 'agent', 1, 3),
  ('under_contract', 'Order survey', 'Order or confirm existing survey for the property through title company.', 'agent', 2, 4),
  ('under_contract', 'Schedule appraisal access', 'Coordinate property access for appraiser with seller or showing instructions.', 'agent', 3, 5),
  ('under_contract', 'Monitor option period and inspection', 'Track inspection scheduling, results, and any repair negotiations during option period.', 'agent', 3, 6),
  ('under_contract', 'Confirm title commitment received', 'Verify title commitment has been issued and review for any exceptions or issues.', 'agent', 10, 7),
  ('under_contract', 'Confirm appraisal complete', 'Verify appraisal has been completed and value meets or exceeds contract price.', 'agent', 14, 8),
  ('under_contract', 'Confirm financing approval', 'Verify buyer''s loan has received full underwriting approval (clear to close).', 'agent', 21, 9),
  ('under_contract', 'Utility transfer reminder to seller', 'Remind seller to schedule utility transfers and disconnects for closing day.', 'agent', 25, 10);

-- Default tasks: Closing
INSERT INTO default_tasks (stage_key, task_name, task_description, assigned_to, due_offset_days, sort_order) VALUES
  ('closing', 'Confirm closing date, time, and location with title', 'Verify final closing appointment details with title company and all parties.', 'agent', -3, 1),
  ('closing', 'Final walkthrough scheduled', 'Schedule buyer''s final walkthrough of the property before closing.', 'agent', -2, 2),
  ('closing', 'Wire fraud warning sent to seller', 'Send wire fraud awareness notice to seller before they receive wiring instructions.', 'agent', -2, 3),
  ('closing', 'Confirm funding with title', 'Verify all funds have been received and the transaction is ready to fund.', 'agent', 0, 4),
  ('closing', 'Confirm deed recorded', 'Verify the deed has been recorded with the county clerk''s office.', 'agent', 0, 5),
  ('closing', 'Collect keys and garage openers', 'Collect all keys, garage remotes, and access devices from seller for buyer.', 'agent', 0, 6),
  ('closing', 'Send post-close thank you and review request', 'Send personalized thank you note and request for online review from seller.', 'agent', 1, 7);

-- Email Templates
INSERT INTO email_templates (stage_key, template_name, template_key, subject, body_html, send_offset_days, send_to, sort_order) VALUES

-- Pre-Listing Templates
('pre_listing', 'Pre-Listing Welcome', 'pre_listing_welcome',
 'Welcome to Clear2Close — Let''s Get {{property_address}} Ready!',
 '<h2>Welcome, {{seller_name}}!</h2>
<p>Thank you for choosing {{agent_name}} to sell your home at <strong>{{property_address}}</strong>. We''re excited to partner with you on this journey.</p>
<p>Over the next few days, you''ll receive a series of emails walking you through each step of the pre-listing process. Here''s what to expect:</p>
<ul>
  <li><strong>Listing Agreement</strong> — You''ll receive a DocuSign envelope to review and sign.</li>
  <li><strong>Seller Disclosure</strong> — We use SellerShield to streamline your required disclosures.</li>
  <li><strong>Home Prep Checklist</strong> — Tips to maximize your home''s first impression.</li>
  <li><strong>Professional Photography</strong> — We''ll schedule a photographer once your home is photo-ready.</li>
</ul>
<p>If you have any questions at all, don''t hesitate to reach out. Let''s get you to the closing table!</p>
<p>Best,<br/>{{agent_name}}</p>',
 0, ARRAY['seller'], 1),

('pre_listing', 'Disclosure Reminder', 'pre_listing_disclosure_reminder',
 'Action Required: Complete Your Seller Disclosure for {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>Just a friendly reminder — please complete your seller''s disclosure through SellerShield as soon as possible. This is a required legal document and we need it finalized before we go live on MLS.</p>
<p>If you haven''t received the SellerShield email, please check your spam folder or let me know and I''ll resend it.</p>
<p>Thanks for staying on top of this!</p>
<p>Best,<br/>{{agent_name}}</p>',
 1, ARRAY['seller'], 2),

('pre_listing', 'Photo Prep Reminder', 'pre_listing_photo_prep',
 'Photography Scheduled — Home Prep Tips for {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>Professional photography has been scheduled for your home. Here are a few tips to ensure your property looks its absolute best:</p>
<ul>
  <li>Declutter countertops, shelves, and closets</li>
  <li>Remove personal photos and items</li>
  <li>Ensure all lights are working and blinds are open</li>
  <li>Mow the lawn and tidy up landscaping</li>
  <li>Clean all bathrooms and the kitchen thoroughly</li>
  <li>Remove vehicles from the driveway</li>
</ul>
<p>Great photos are the #1 factor in getting buyers through the door. Let me know if you need any help!</p>
<p>Best,<br/>{{agent_name}}</p>',
 3, ARRAY['seller'], 3),

('pre_listing', 'Net Sheet Preview', 'pre_listing_net_sheet',
 'Your Estimated Net Sheet for {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>As we get closer to going live, I wanted to share a preliminary seller net sheet so you have a clear picture of your estimated proceeds.</p>
<p>This estimate is based on a list price and standard closing costs for your area. The final numbers will depend on the actual contract price and any negotiated terms.</p>
<p>I''ve attached the net sheet for your review. Please let me know if you have any questions or if you''d like to discuss pricing strategy before we go live.</p>
<p>Best,<br/>{{agent_name}}</p>',
 5, ARRAY['seller'], 4),

-- Active Listing Templates
('active_listing', 'Listing Live Notification', 'active_listing_live',
 '🏡 Your Home is LIVE on MLS — {{property_address}}',
 '<h2>Exciting News, {{seller_name}}!</h2>
<p>Your home at <strong>{{property_address}}</strong> is now live on the MLS and active real estate portals (Zillow, Realtor.com, Redfin, etc.).</p>
<p>Here''s what to expect over the coming days:</p>
<ul>
  <li>Showing requests will come through ShowingTime — I''ll keep you posted.</li>
  <li>I''ll be monitoring all showing feedback and market activity.</li>
  <li>We''ll review our strategy after the first week on market.</li>
</ul>
<p>Keep the home show-ready and remember: clean, bright, and clutter-free wins buyers over.</p>
<p>Let''s do this!</p>
<p>Best,<br/>{{agent_name}}</p>',
 0, ARRAY['seller'], 5),

('active_listing', 'Week One Feedback', 'active_listing_week_one_feedback',
 'First Week Market Update — {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>We''ve completed our first week on the market! Here''s a quick summary:</p>
<p>I''ve compiled the showing feedback from this week and want to share the highlights with you. I''ll send a detailed report shortly.</p>
<p>Based on the activity and feedback, here are my initial thoughts on our strategy moving forward. Let me know if you''d like to schedule a quick call to discuss.</p>
<p>Best,<br/>{{agent_name}}</p>',
 7, ARRAY['seller'], 6),

('active_listing', 'Price Review', 'active_listing_price_review',
 'Market Strategy Review — {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>It''s been two weeks since we went live with {{property_address}}. I wanted to touch base about our pricing strategy.</p>
<p>The first two weeks are the most critical window for attracting offers. I''d like to review the current market data and showing activity with you to make sure we''re positioned competitively.</p>
<p>Can we schedule a quick 15-minute call this week to review our options? I want to make sure we''re doing everything possible to get you to the closing table.</p>
<p>Best,<br/>{{agent_name}}</p>',
 14, ARRAY['seller'], 7),

-- Under Contract Templates
('under_contract', 'Congratulations — Under Contract', 'under_contract_congratulations',
 '🎉 Congratulations — {{property_address}} is Under Contract!',
 '<h2>Congratulations, {{seller_name}}!</h2>
<p>Great news — we have an executed contract on <strong>{{property_address}}</strong>!</p>
<p>Here are the key dates you need to know:</p>
<ul>
  <li><strong>Contract Price:</strong> See attached contract summary</li>
  <li><strong>Option Period Ends:</strong> Check your contract for the exact date</li>
  <li><strong>Closing Date:</strong> {{closing_date}}</li>
</ul>
<p>I''ll be in touch regularly with updates as we move through the contract-to-close process. The next email will outline the full timeline so you know exactly what to expect.</p>
<p>Best,<br/>{{agent_name}}</p>',
 0, ARRAY['seller'], 8),

('under_contract', 'Timeline Overview', 'under_contract_timeline_overview',
 'Your Contract-to-Close Timeline — {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>Now that we''re under contract, here''s an overview of the key milestones between now and closing on <strong>{{closing_date}}</strong>:</p>
<ul>
  <li><strong>Earnest Money & Option Fee</strong> — Buyer delivers these within the first few days.</li>
  <li><strong>Option Period</strong> — Buyer conducts inspections and may negotiate repairs.</li>
  <li><strong>Appraisal</strong> — Lender orders appraisal to verify property value.</li>
  <li><strong>Title Work</strong> — Title company issues commitment and resolves any title issues.</li>
  <li><strong>Financing Approval</strong> — Buyer''s lender provides clear-to-close.</li>
  <li><strong>Final Walkthrough</strong> — Buyer verifies property condition before closing.</li>
  <li><strong>Closing Day</strong> — Sign, fund, and hand over the keys!</li>
</ul>
<p>I''ll keep you updated at each step. Don''t hesitate to reach out with questions.</p>
<p>Best,<br/>{{agent_name}}</p>',
 0, ARRAY['seller'], 9),

('under_contract', 'Option Period Update', 'under_contract_option_period_update',
 'Option Period Update — {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>Just checking in on the option period for {{property_address}}. The buyer''s inspection window is underway, and I wanted to keep you informed.</p>
<p>If the buyer requests any repairs, I''ll walk you through your options. Remember — during the option period, the buyer can terminate for any reason, so let''s stay responsive to any requests.</p>
<p>I''ll update you as soon as I hear back from the buyer''s agent.</p>
<p>Best,<br/>{{agent_name}}</p>',
 3, ARRAY['seller'], 10),

('under_contract', 'Appraisal Scheduled', 'under_contract_appraisal_scheduled',
 'Appraisal Scheduled — {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>The lender has ordered the appraisal for {{property_address}}. Here''s what you need to know:</p>
<ul>
  <li>Please ensure the home is clean and accessible for the appraiser.</li>
  <li>All utilities should be on.</li>
  <li>The appraiser will take photos and measure the property.</li>
</ul>
<p>I''ll let you know as soon as we receive the appraisal results. If you have any questions, feel free to reach out.</p>
<p>Best,<br/>{{agent_name}}</p>',
 7, ARRAY['seller'], 11),

('under_contract', 'Closing Countdown', 'under_contract_closing_countdown',
 'Closing Countdown — {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>We''re getting close! Here''s where we stand heading into the final stretch for {{property_address}}:</p>
<ul>
  <li>Financing status update</li>
  <li>Title work progress</li>
  <li>Remaining items to complete before closing</li>
</ul>
<p>I''ll be confirming the final closing details with the title company shortly. Start thinking about:</p>
<ul>
  <li>Scheduling utility disconnects or transfers</li>
  <li>Gathering all keys, garage remotes, and gate codes</li>
  <li>Your plans for move-out and possession transfer</li>
</ul>
<p>Almost there!</p>
<p>Best,<br/>{{agent_name}}</p>',
 21, ARRAY['seller'], 12),

-- Closing Templates
('closing', 'Final Walkthrough Reminder', 'closing_final_walkthrough_reminder',
 'Final Walkthrough Reminder — {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>The buyer''s final walkthrough for {{property_address}} is coming up. Please make sure:</p>
<ul>
  <li>All agreed-upon repairs have been completed</li>
  <li>The home is in the condition specified in the contract</li>
  <li>All personal belongings are removed (unless otherwise agreed)</li>
  <li>The home is clean and all systems are functioning</li>
</ul>
<p>If you have any questions about what should or shouldn''t remain, please let me know ASAP.</p>
<p>Best,<br/>{{agent_name}}</p>',
 -2, ARRAY['seller'], 13),

('closing', 'Closing Day Logistics', 'closing_day_logistics',
 'Tomorrow is Closing Day — {{property_address}}',
 '<h2>Hi {{seller_name}},</h2>
<p>Tomorrow is the big day! Here''s everything you need for closing on {{property_address}}:</p>
<ul>
  <li><strong>Date:</strong> {{closing_date}}</li>
  <li><strong>What to bring:</strong> Valid government-issued photo ID</li>
  <li><strong>Important:</strong> Do NOT wire any funds without verbal confirmation from the title company. Wire fraud is real — always verify wiring instructions by phone.</li>
</ul>
<p>I''ll be available throughout the day if you need anything. Congratulations on reaching the finish line!</p>
<p>Best,<br/>{{agent_name}}</p>',
 -1, ARRAY['seller'], 14),

('closing', 'Closing Congratulations', 'closing_congratulations',
 '🎉 Congratulations — {{property_address}} is SOLD!',
 '<h2>Congratulations, {{seller_name}}!</h2>
<p>It''s official — <strong>{{property_address}}</strong> has closed and funded! The deed has been recorded and the transaction is complete.</p>
<p>Thank you for trusting me with one of the biggest financial decisions of your life. It has been a pleasure working with you.</p>
<p>A few final notes:</p>
<ul>
  <li>Keep your closing documents in a safe place for tax purposes.</li>
  <li>Your proceeds should arrive per the title company''s instructions.</li>
  <li>If you know anyone looking to buy or sell, I''d love a referral!</li>
</ul>
<p>If you have a moment, I''d truly appreciate a quick review — it helps my business more than you know.</p>
<p>Wishing you all the best in your next chapter!</p>
<p>Warmly,<br/>{{agent_name}}</p>',
 0, ARRAY['seller'], 15)

ON CONFLICT (template_key) DO NOTHING;
