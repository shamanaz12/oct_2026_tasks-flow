const COLORS = ['bg-violet-500', 'bg-pink-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

export function Avatar({ user, size = 32, online }) {
  if (!user) return null;
  const color = COLORS[(user.name?.charCodeAt(0) || 0) % COLORS.length];
  const initials = (user.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className="relative inline-block shrink-0" title={user.name}>
      {user.avatar
        ? <img src={user.avatar} alt={user.name} style={{ width: size, height: size }} className="rounded-full object-cover ring-2 ring-white" />
        : <span style={{ width: size, height: size, fontSize: size * 0.4 }} className={`${color} inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white`}>{initials}</span>}
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />}
    </span>
  );
}

export function AvatarStack({ users = [], max = 4, size = 28 }) {
  return (
    <div className="flex -space-x-2">
      {users.slice(0, max).map((u) => <Avatar key={u._id} user={u} size={size} />)}
      {users.length > max && <span style={{ width: size, height: size }} className="inline-flex items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 ring-2 ring-white">+{users.length - max}</span>}
    </div>
  );
}
