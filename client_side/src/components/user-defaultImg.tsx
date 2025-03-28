interface UserProfileProps {
  name: string;
  email: string;
}

export function UserDefaultImg({ name, email }: UserProfileProps) {
  // Function to get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex items-center space-x-3  text-gray-12 rounded-lg">
      {/* Default Profile Picture */}
      <div className="w-12 h-12 bg-pink-200 text-pink-700 flex items-center justify-center rounded-full text-lg font-bold">
        {getInitials(name)}
      </div>

      {/* User Info */}
      <div>
        <p className=" font-semibold">{name}</p>
        <p className="text-xs text-gray-10">{email}</p>
      </div>
    </div>
  );
}
