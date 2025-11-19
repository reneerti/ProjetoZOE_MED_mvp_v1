-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to get admin statistics
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_measurements BIGINT,
  total_uploads BIGINT,
  successful_uploads BIGINT,
  failed_uploads BIGINT,
  total_storage_mb NUMERIC,
  this_month_uploads BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT bm.user_id)::BIGINT as total_users,
    COUNT(DISTINCT bm.id)::BIGINT as total_measurements,
    COUNT(DISTINCT bu.id)::BIGINT as total_uploads,
    SUM(CASE WHEN bu.status = 'completed' THEN 1 ELSE 0 END)::BIGINT as successful_uploads,
    SUM(CASE WHEN bu.status = 'error' THEN 1 ELSE 0 END)::BIGINT as failed_uploads,
    0::NUMERIC as total_storage_mb,
    COUNT(DISTINCT CASE 
      WHEN bu.created_at >= date_trunc('month', now()) 
      THEN bu.id 
    END)::BIGINT as this_month_uploads
  FROM bioimpedance_measurements bm
  LEFT JOIN bioimpedance_uploads bu ON bu.measurement_id = bm.id;
END;
$$;

-- Create function to get user-specific statistics
CREATE OR REPLACE FUNCTION public.get_user_stats(_user_id UUID)
RETURNS TABLE (
  total_measurements BIGINT,
  total_uploads BIGINT,
  successful_uploads BIGINT,
  failed_uploads BIGINT,
  this_month_uploads BIGINT,
  storage_used_mb NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT bm.id)::BIGINT as total_measurements,
    COUNT(DISTINCT bu.id)::BIGINT as total_uploads,
    SUM(CASE WHEN bu.status = 'completed' THEN 1 ELSE 0 END)::BIGINT as successful_uploads,
    SUM(CASE WHEN bu.status = 'error' THEN 1 ELSE 0 END)::BIGINT as failed_uploads,
    COUNT(DISTINCT CASE 
      WHEN bu.created_at >= date_trunc('month', now()) 
      THEN bu.id 
    END)::BIGINT as this_month_uploads,
    0::NUMERIC as storage_used_mb
  FROM bioimpedance_measurements bm
  LEFT JOIN bioimpedance_uploads bu ON bu.user_id = _user_id AND bu.measurement_id = bm.id
  WHERE bm.user_id = _user_id;
END;
$$;

-- Create function to get all users for admin
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  total_uploads BIGINT,
  last_upload TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only allow admins to call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    p.display_name,
    COUNT(bu.id)::BIGINT as total_uploads,
    MAX(bu.created_at) as last_upload,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.bioimpedance_uploads bu ON bu.user_id = au.id
  GROUP BY au.id, au.email, p.display_name, au.created_at
  ORDER BY au.created_at DESC;
END;
$$;

-- Create trigger to assign default 'user' role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();