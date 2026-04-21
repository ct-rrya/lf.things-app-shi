-- ============================================================================
-- COMPLETE DATABASE REDESIGN FOR LOST & FOUND APP
-- ============================================================================
-- This schema implements a clean separation between:
-- 1. students (masterlist - pre-populated)
-- 2. users (only students who signed up)
-- 3. items (registered by users)
-- 4. lost_reports (formal lost item reports)
-- 5. scan_events (QR scan tracking)
-- 6. notifications (push/email notifications)
-- 7. chat_messages (in-app messaging)
-- ============================================================================

-- Drop existing tables if they exist (in correct order to handle dependencies)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS scan_events CASCADE;
DROP TABLE IF EXISTS lost_reports CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- ============================================================================
-- 1. STUDENTS TABLE (Masterlist - Pre-populated by Admin)
-- ============================================================================
CREATE TABLE students (
    student_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    middle_name TEXT,
    program TEXT NOT NULL,
    year_level TEXT NOT NULL CHECK (year_level IN ('1st Year', '2nd Year', '3rd Year', '4th Year')),
    section TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'dropped')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for students table
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_program ON students(program);

-- ============================================================================
-- 2. USERS TABLE (Linked to auth.users, only students who signed up)
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id TEXT UNIQUE REFERENCES students(student_id) ON DELETE SET NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'staff')),
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- 3. ITEMS TABLE (Items registered by users)
-- ============================================================================
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(student_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('id', 'keys', 'laptop', 'phone', 'bottle', 'wallet', 'bag', 'watch', 'headphones', 'other')),
    description TEXT,
    photo_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'safe' CHECK (status IN ('safe', 'lost', 'found', 'claimed', 'returned')),
    metadata JSONB DEFAULT '{}',
    qr_code TEXT UNIQUE NOT NULL,
    scan_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for items table
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_student_id ON items(student_id);
CREATE INDEX idx_items_qr_code ON items(qr_code);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_metadata ON items USING GIN(metadata);

-- ============================================================================
-- 4. LOST_REPORTS TABLE (Formal lost item reports)
-- ============================================================================
CREATE TABLE lost_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_location TEXT NOT NULL,
    last_seen_date DATE NOT NULL,
    circumstances TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'resolved')),
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lost_reports table
CREATE INDEX idx_lost_reports_item_id ON lost_reports(item_id);
CREATE INDEX idx_lost_reports_user_id ON lost_reports(user_id);
CREATE INDEX idx_lost_reports_status ON lost_reports(status);

-- ============================================================================
-- 5. SCAN_EVENTS TABLE (Track all QR scans)
-- ============================================================================
CREATE TABLE scan_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    scanner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scanner_type TEXT NOT NULL CHECK (scanner_type IN ('app', 'web')),
    scanner_ip TEXT,
    location TEXT,
    action_taken TEXT CHECK (action_taken IN ('notified_owner', 'returned_to_ssg', 'chatted', 'viewed', 'reported_found')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scan_events table
CREATE INDEX idx_scan_events_item_id ON scan_events(item_id);
CREATE INDEX idx_scan_events_scanner_user_id ON scan_events(scanner_user_id);
CREATE INDEX idx_scan_events_created_at ON scan_events(created_at DESC);

-- ============================================================================
-- 6. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('item_scanned', 'item_found', 'item_returned', 'message', 'system')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications table
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- 7. CHAT_MESSAGES TABLE (In-app chat between finder and owner)
-- ============================================================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_messages table
CREATE INDEX idx_chat_messages_item_id ON chat_messages(item_id);
CREATE INDEX idx_chat_messages_from_user_id ON chat_messages(from_user_id);
CREATE INDEX idx_chat_messages_to_user_id ON chat_messages(to_user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lost_reports_updated_at BEFORE UPDATE ON lost_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER TO AUTO-UPDATE ITEM STATUS WHEN LOST REPORT IS CREATED
-- ============================================================================
CREATE OR REPLACE FUNCTION update_item_status_on_lost_report()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items SET status = 'lost' WHERE id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_item_status_lost AFTER INSERT ON lost_reports
    FOR EACH ROW EXECUTE FUNCTION update_item_status_on_lost_report();

-- ============================================================================
-- TRIGGER TO INCREMENT SCAN COUNT
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_scan_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items SET scan_count = scan_count + 1 WHERE id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_increment_scan_count AFTER INSERT ON scan_events
    FOR EACH ROW EXECUTE FUNCTION increment_scan_count();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STUDENTS TABLE POLICIES
-- ============================================================================
-- Admins can do everything
CREATE POLICY "Admins can manage students" ON students
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'staff')
        )
    );

-- All authenticated users can view active students
CREATE POLICY "Users can view active students" ON students
    FOR SELECT USING (
        auth.role() = 'authenticated' AND status = 'active'
    );

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'staff')
        )
    );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'staff')
        )
    );

-- ============================================================================
-- ITEMS TABLE POLICIES
-- ============================================================================
-- Users can view their own items
CREATE POLICY "Users can view own items" ON items
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own items
CREATE POLICY "Users can insert own items" ON items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own items
CREATE POLICY "Users can update own items" ON items
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own items
CREATE POLICY "Users can delete own items" ON items
    FOR DELETE USING (auth.uid() = user_id);

-- Anyone can view items by QR code (for scanning)
CREATE POLICY "Anyone can view items by QR" ON items
    FOR SELECT USING (true);

-- Admins can view all items
CREATE POLICY "Admins can view all items" ON items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'staff')
        )
    );

-- ============================================================================
-- LOST_REPORTS TABLE POLICIES
-- ============================================================================
-- Users can view their own lost reports
CREATE POLICY "Users can view own lost reports" ON lost_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own lost reports
CREATE POLICY "Users can insert own lost reports" ON lost_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own lost reports
CREATE POLICY "Users can update own lost reports" ON lost_reports
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all lost reports
CREATE POLICY "Admins can view all lost reports" ON lost_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'staff')
        )
    );

-- ============================================================================
-- SCAN_EVENTS TABLE POLICIES
-- ============================================================================
-- Item owners can view scans of their items
CREATE POLICY "Owners can view scans of their items" ON scan_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM items 
            WHERE items.id = scan_events.item_id 
            AND items.user_id = auth.uid()
        )
    );

-- Anyone can insert scan events
CREATE POLICY "Anyone can insert scan events" ON scan_events
    FOR INSERT WITH CHECK (true);

-- Admins can view all scan events
CREATE POLICY "Admins can view all scan events" ON scan_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'staff')
        )
    );

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- CHAT_MESSAGES TABLE POLICIES
-- ============================================================================
-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages" ON chat_messages
    FOR SELECT USING (
        auth.uid() = from_user_id OR auth.uid() = to_user_id
    );

-- Users can insert messages they send
CREATE POLICY "Users can insert their messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can update received messages" ON chat_messages
    FOR UPDATE USING (auth.uid() = to_user_id);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'staff')
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique QR code
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random 12-character alphanumeric code
        new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM items WHERE qr_code = new_code) INTO code_exists;
        
        -- Exit loop if code is unique
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to get user profile with student details
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    student_id TEXT,
    email TEXT,
    role TEXT,
    is_verified BOOLEAN,
    last_login TIMESTAMPTZ,
    first_name TEXT,
    last_name TEXT,
    middle_name TEXT,
    program TEXT,
    year_level TEXT,
    section TEXT,
    phone_number TEXT,
    student_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.student_id,
        u.email,
        u.role,
        u.is_verified,
        u.last_login,
        s.first_name,
        s.last_name,
        s.middle_name,
        s.program,
        s.year_level,
        s.section,
        s.phone_number,
        s.status as student_status
    FROM users u
    LEFT JOIN students s ON u.student_id = s.student_id
    WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample students
INSERT INTO students (student_id, first_name, last_name, middle_name, program, year_level, section, email, phone_number, status) VALUES
('2021-12345', 'Juan', 'Dela Cruz', 'Santos', 'BSIT', '3rd Year', 'A', 'juan.delacruz@university.edu', '09171234567', 'active'),
('2021-12346', 'Maria', 'Garcia', 'Reyes', 'BSCS', '2nd Year', 'B', 'maria.garcia@university.edu', '09181234567', 'active'),
('2021-12347', 'Pedro', 'Santos', 'Lopez', 'BSED-Math', '4th Year', 'A', 'pedro.santos@university.edu', '09191234567', 'active');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all tables
SELECT 'students' as table_name, COUNT(*) as row_count FROM students
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'items', COUNT(*) FROM items
UNION ALL
SELECT 'lost_reports', COUNT(*) FROM lost_reports
UNION ALL
SELECT 'scan_events', COUNT(*) FROM scan_events
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages;
