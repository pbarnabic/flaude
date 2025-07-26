export const validateUsername = (user) => {
    if (user.length < 2) {
        return 'Username must be at least 2 characters long';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(user)) {
        return 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    return '';
};

export const validatePassword = (pwd) => {
    if (pwd.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(pwd)) {
        return 'Password must contain at least one number';
    }
    return '';
};
