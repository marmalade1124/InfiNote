-- Enable Row Level Security (RLS) is essential for security
-- Create PROFILES table
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- PROFILES Policies
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

-- Create BOARDS table
create table boards (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references auth.users not null,
  title text default 'Untitled Board',
  view_state jsonb default '{"x": 0, "y": 0, "zoom": 1, "showGrid": true, "snapToGrid": false}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_modified timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BOARDS Policies
alter table boards enable row level security;
create policy "Users can view their own boards." on boards for select using ( auth.uid() = owner_id );
create policy "Users can insert their own boards." on boards for insert with check ( auth.uid() = owner_id );
create policy "Users can update their own boards." on boards for update using ( auth.uid() = owner_id );
create policy "Users can delete their own boards." on boards for delete using ( auth.uid() = owner_id );

-- Create NOTES table
create table notes (
  id uuid default uuid_generate_v4() primary key,
  board_id uuid references boards(id) on delete cascade not null,
  x float not null,
  y float not null,
  width float,
  height float,
  title text default '',
  content text default '',
  type text default 'card', -- 'card', 'sticky', 'text'
  color text default 'blue',
  tags text[] default array[]::text[],
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- NOTES Policies
alter table notes enable row level security;
-- Simplified policy: if you can see the board, you can see/edit the notes (for now, assuming single owner or shared board logic later)
create policy "Board owners can view notes" on notes for select using ( exists (select 1 from boards where id = notes.board_id and owner_id = auth.uid()) );
create policy "Board owners can insert notes" on notes for insert with check ( exists (select 1 from boards where id = board_id and owner_id = auth.uid()) );
create policy "Board owners can update notes" on notes for update using ( exists (select 1 from boards where id = notes.board_id and owner_id = auth.uid()) );
create policy "Board owners can delete notes" on notes for delete using ( exists (select 1 from boards where id = notes.board_id and owner_id = auth.uid()) );


-- Create CONNECTIONS table
create table connections (
  id uuid default uuid_generate_v4() primary key,
  board_id uuid references boards(id) on delete cascade not null,
  from_id uuid references notes(id) on delete cascade not null,
  to_id uuid references notes(id) on delete cascade not null,
  source_handle text,
  target_handle text,
  type text default 'curve',
  color text default '#6b7280',
  stroke_width float default 2,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CONNECTIONS Policies
alter table connections enable row level security;
create policy "Board owners can view connections" on connections for select using ( exists (select 1 from boards where id = connections.board_id and owner_id = auth.uid()) );
create policy "Board owners can insert connections" on connections for insert with check ( exists (select 1 from boards where id = board_id and owner_id = auth.uid()) );
create policy "Board owners can update connections" on connections for update using ( exists (select 1 from boards where id = connections.board_id and owner_id = auth.uid()) );
create policy "Board owners can delete connections" on connections for delete using ( exists (select 1 from boards where id = connections.board_id and owner_id = auth.uid()) );

-- Create DRAWINGS table
create table drawings (
  id uuid default uuid_generate_v4() primary key,
  board_id uuid references boards(id) on delete cascade not null,
  points jsonb not null, -- Array of {x, y}
  color text default '#ef4444',
  stroke_width float default 3,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- DRAWINGS Policies
alter table drawings enable row level security;
create policy "Board owners can view drawings" on drawings for select using ( exists (select 1 from boards where id = drawings.board_id and owner_id = auth.uid()) );
create policy "Board owners can insert drawings" on drawings for insert with check ( exists (select 1 from boards where id = board_id and owner_id = auth.uid()) );
create policy "Board owners can update drawings" on drawings for update using ( exists (select 1 from boards where id = drawings.board_id and owner_id = auth.uid()) );
create policy "Board owners can delete drawings" on drawings for delete using ( exists (select 1 from boards where id = drawings.board_id and owner_id = auth.uid()) );


-- Realtime subscription setup
-- You need to enable replication for these tables in the Supabase Dashboard > Database > Replication
-- Or run:
alter publication supabase_realtime add table boards, notes, connections, drawings;
