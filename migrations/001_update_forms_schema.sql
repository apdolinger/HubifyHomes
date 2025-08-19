-- Migration to update forms schema to simplified structure
-- Drop existing forms tables and recreate with new structure

BEGIN;

-- Drop existing foreign key constraints and tables
DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS form_fields CASCADE;
DROP TABLE IF EXISTS property_forms CASCADE;
DROP TABLE IF EXISTS forms CASCADE;

-- Create simplified forms table
CREATE TABLE forms (
    id SERIAL PRIMARY KEY,
    form_title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    contexts TEXT[] NOT NULL, -- ['people', 'property', 'task']
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create form_fields table with context column
CREATE TABLE form_fields (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    type TEXT NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    profile_field_key TEXT, -- maps to database field
    context TEXT NOT NULL -- 'people', 'property', or 'task'
);

-- Create form_submissions table with proper foreign keys
CREATE TABLE form_submissions (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES contacts(id), -- if people context used
    property_id INTEGER REFERENCES properties(id), -- if property context used  
    task_id INTEGER REFERENCES tasks(id), -- if task context used
    data JSONB NOT NULL,
    submitted_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX idx_form_fields_context ON form_fields(context);
CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_profile_id ON form_submissions(profile_id);
CREATE INDEX idx_form_submissions_property_id ON form_submissions(property_id);
CREATE INDEX idx_form_submissions_task_id ON form_submissions(task_id);

COMMIT;