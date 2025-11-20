-- Allow users to insert their own role (FOR TESTING ONLY)
-- This should be removed in production
CREATE POLICY "Users can insert their own role (test only)"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own role (FOR TESTING ONLY)  
-- This should be removed in production
CREATE POLICY "Users can update their own role (test only)"
ON user_roles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);