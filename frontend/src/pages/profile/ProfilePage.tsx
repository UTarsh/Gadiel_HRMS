import { useState, useRef, type ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi, resolveAvatarUrl } from '@/api/profile'
import { useAuthStore } from '@/store/auth'
import { AdjustableImageUpload } from '@/components/shared/AdjustableImageUpload'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function ProfilePage() {
  const qc = useQueryClient()
  const { employee } = useAuthStore()
  const [avatarTs, setAvatarTs] = useState(0)

  const { data, isLoading } = useQuery({ queryKey: ['my-extended-profile'], queryFn: () => profileApi.getMe() })
  const emp = data?.data?.data
  const profile = emp?.profile ?? null

  const saveMutation = useMutation({
    mutationFn: () => profileApi.update({}),
    onSuccess: () => {
      toast.success('Profile saved!')
      qc.invalidateQueries({ queryKey: ['my-extended-profile'] })
    },
  })

  async function handleAvatarChange(input: File | ChangeEvent<HTMLInputElement>) {
    const file = input instanceof File ? input : input.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return
    try {
      await profileApi.uploadAvatar(file)
      setAvatarTs(Date.now())
      toast.success('Photo updated!')
      qc.invalidateQueries({ queryKey: ['my-extended-profile'] })
    } catch {}
  }

  if (isLoading || !emp) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>

  const avatarUrl = resolveAvatarUrl(profile?.avatar_url, avatarTs || undefined)

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl p-8 relative overflow-hidden shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
         {/* Background art mock */}
         <div className="absolute right-0 top-0 opacity-40 pointer-events-none w-1/3 h-full" style={{ background: 'radial-gradient(circle at top right, #FFD6C1, transparent 70%)'}}></div>
         
         <div className="flex flex-col lg:flex-row gap-8 relative z-10">
            {/* AVATAR */}
            <div className="w-56 shrink-0 flex flex-col items-center">
              <div className="w-48 h-48 rounded-3xl overflow-hidden mb-4 border border-gray-100 shadow-sm relative group">
                <img src={avatarUrl || 'https://i.pravatar.cc/200?img=11'} alt="Profile" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-white text-xs font-bold">Change Photo</span>
                </div>
              </div>
              <button className="w-full bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#DBEAFE] font-bold py-2.5 rounded-xl transition text-sm flex justify-center items-center gap-2">
                 <span className="material-symbols-outlined text-sm">photo_camera</span> Change Photo
              </button>
            </div>

            {/* INFO */}
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                 <div>
                   <h1 className="text-3xl font-extrabold text-[#1A1A2E] mb-2 font-display flex items-center gap-3">
                     {emp.full_name}
                     <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] tracking-widest uppercase">Super Admin</span>
                   </h1>
                   <div className="flex gap-2">
                     <span className="text-[11px] font-bold text-[#3B82F6] bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#DBEAFE]">Lead Data & AI Engineer</span>
                     <span className="text-[11px] font-bold text-[#6B7280] bg-[#F3F4F6] px-3 py-1 rounded-full border border-[#E5E7EB]">{emp.department?.name || 'IT & Consultancy'}</span>
                   </div>
                 </div>
                 <button className="border border-[#F97316] text-[#ea580c] hover:bg-[#FFEDE0] font-bold py-2 px-4 rounded-full transition text-[11px] flex items-center gap-1.5 uppercase tracking-widest">
                   <span className="material-symbols-outlined text-[14px]">edit</span> Edit Profile
                 </button>
              </div>

              <div className="flex gap-4 mb-8">
                 <div className="flex items-center gap-1.5 text-xs font-bold text-[#4B5563] bg-white px-3 py-1.5 rounded-full border shadow-sm">
                   <span className="material-symbols-outlined text-sm text-[#F59E0B]">badge</span> {emp.emp_code}
                 </div>
                 <div className="flex items-center gap-1.5 text-xs font-bold text-[#4B5563] bg-white px-3 py-1.5 rounded-full border shadow-sm">
                   <span className="material-symbols-outlined text-sm text-[#3B82F6]">event</span> Joined {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-GB') : 'Jan 2025'}
                 </div>
                 <div className="flex items-center gap-1.5 text-xs font-bold text-[#16A34A] bg-[#DCFCE7] px-3 py-1.5 rounded-full border border-[#bbf7d0] shadow-sm">
                   <span className="material-symbols-outlined text-sm">energy_savings_leaf</span> Active
                 </div>
              </div>

              <div className="mb-6">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9CA3AF] mb-2">About Me</p>
                <p className="text-sm text-[#4B5563] font-medium">{profile?.bio || 'Hi, I love to build stuff.'}</p>
              </div>

              <div className="mb-6">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9CA3AF] mb-2">Skills & Expertise</p>
                <div className="flex gap-2">
                  {['Python', 'SQL', 'CloudOps', 'ML', 'Full-Stack'].map(s => (
                    <span key={s} className="text-xs font-bold text-[#3B82F6] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9CA3AF] mb-2">Connect & Build</p>
                <div className="flex gap-3">
                  <button className="text-xs font-bold text-[#4B5563] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 hover:bg-gray-50">
                    LinkedIn <span className="material-symbols-outlined text-sm text-[#0A66C2]">link</span>
                  </button>
                  <button className="text-xs font-bold text-[#4B5563] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 hover:bg-gray-50">
                    GitHub <span className="material-symbols-outlined text-sm text-[#24292F]">code</span>
                  </button>
                  <button className="text-xs font-bold text-[#3B82F6] bg-[#EFF6FF] border border-[#DBEAFE] px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">language</span> Profile
                  </button>
                </div>
              </div>
            </div>
         </div>
      </div>

      {/* DETAILS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white rounded-[20px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
              <span className="material-symbols-outlined">work</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#1A1A2E] mb-0.5 flex items-center gap-2">Employment Details <span className="text-[9px] bg-[#EFF6FF] text-[#3B82F6] px-1.5 py-0.5 rounded">Full Time</span></p>
              <p className="text-[11px] text-[#6B7280] font-medium mb-1 truncate">Lead Data & AI Engineer • IT & Consultancy</p>
              <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span> {emp.work_location || 'Hyderabad, India'}</p>
            </div>
         </div>
         <div className="bg-white rounded-[20px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] flex items-center justify-center text-[#8B5CF6]">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#1A1A2E] mb-1">Personal Details</p>
              <p className="text-[11px] text-[#6B7280] font-medium mb-1 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">call</span> {profile?.phone || '7291010106'}</p>
              <p className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">mail</span> {emp.email}</p>
            </div>
         </div>
         <div className="bg-white rounded-[20px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF4FF] flex items-center justify-center text-[#D946EF]">
              <span className="material-symbols-outlined">computer</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#1A1A2E] mb-1">Company Hardware</p>
              <p className="text-[11px] text-[#6B7280] font-medium mb-1">🖥️ MacBook Pro - 16"</p>
              <p className="text-[10px] text-[#9CA3AF] font-medium">📅 Assigned on 10 Jan 2025</p>
            </div>
         </div>
      </div>

      {/* BADGES ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[20px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex items-center justify-between">
           <div className="flex gap-4">
             <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
                <span className="material-symbols-outlined">emoji_events</span>
             </div>
             <div>
                <p className="text-sm font-extrabold text-[#1A1A2E] mb-1">Accomplishments & Badges</p>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280] text-xs font-semibold mr-2">8 badges collected</span>
                  <span className="text-lg">🥇</span><span className="text-lg">🌟</span><span className="text-lg">🛡️</span><span className="text-lg">🚀</span>
                  <span className="text-[10px] font-bold bg-[#F1F5F9] text-[#64748B] px-2 py-1 rounded-full">+4</span>
                </div>
             </div>
           </div>
        </div>
        <div className="bg-white rounded-[20px] p-6 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0] flex items-center justify-between">
           <div className="flex gap-4">
             <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
                <span className="material-symbols-outlined">verified</span>
             </div>
             <div>
                <p className="text-sm font-extrabold text-[#1A1A2E] mb-1">Professional Certifications</p>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280] text-xs font-semibold mr-2">3 verified certs</span>
                  {/* Mock icons */}
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600">AWS</div>
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">GCP</div>
                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-800">MS</div>
                  <span className="text-[10px] font-bold bg-[#F1F5F9] text-[#64748B] px-2 py-1 rounded-full">+1</span>
                </div>
             </div>
           </div>
        </div>
      </div>

      {/* GADEL CAREER JOURNEY */}
      <div className="bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(249,115,22,0.06)] border border-[#FFEDE0]">
         <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
             <span className="material-symbols-outlined">rocket_launch</span>
           </div>
           <div>
             <h3 className="text-lg font-extrabold text-[#1A1A2E] font-display">Gadel Career Journey</h3>
             <p className="text-xs text-[#6B7280] font-medium">Milestones reaching towards professional excellence</p>
           </div>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           <div className="bg-[#EFF6FF] rounded-2xl p-5 flex flex-col justify-center text-center relative overflow-hidden">
             <span className="material-symbols-outlined absolute right-2 bottom-2 text-4xl opacity-10 text-[#3B82F6]">event</span>
             <p className="text-3xl font-extrabold text-[#1E3A8A] font-display mb-1">459</p>
             <p className="text-[10px] font-bold text-[#1E3A8A] uppercase tracking-widest mb-1">Days at Gadel</p>
             <p className="text-[9px] text-[#3B82F6] font-medium italic">Anniversary!</p>
           </div>
           
           <div className="bg-[#FFFBEB] rounded-2xl p-5 flex flex-col justify-center text-center relative overflow-hidden">
             <span className="material-symbols-outlined absolute right-2 bottom-2 text-4xl opacity-10 text-[#D97706]">ads_click</span>
             <p className="text-3xl font-extrabold text-[#92400E] font-display mb-1">271</p>
             <p className="text-[10px] font-bold text-[#92400E] uppercase tracking-widest mb-1">Always' Goals</p>
             <p className="text-[9px] text-[#D97706] font-medium italic">Goals achieved!</p>
           </div>

           <div className="bg-[#F5F3FF] rounded-2xl p-5 flex flex-col justify-center text-center relative overflow-hidden">
             <span className="material-symbols-outlined absolute right-2 bottom-2 text-4xl opacity-10 text-[#7C3AED]">celebration</span>
             <p className="text-3xl font-extrabold text-[#5B21B6] font-display mb-1">65</p>
             <p className="text-[10px] font-bold text-[#5B21B6] uppercase tracking-widest mb-1">Kudos Received</p>
             <p className="text-[9px] text-[#7C3AED] font-medium italic">Well deserved!</p>
           </div>

           <div className="bg-[#FFEDD5] rounded-2xl p-5 flex flex-col justify-center text-center relative overflow-hidden">
             <span className="material-symbols-outlined absolute right-2 bottom-2 text-4xl opacity-10 text-[#EA580C]">star</span>
             <p className="text-3xl font-extrabold text-[#9A3412] font-display mb-1">Now!</p>
             <p className="text-[10px] font-bold text-[#9A3412] uppercase tracking-widest mb-1">Next Review</p>
             <p className="text-[9px] text-[#EA580C] font-medium italic">Make it amazing.</p>
           </div>

           <div className="bg-[#ECFEFF] rounded-2xl p-5 flex flex-col justify-center text-center relative overflow-hidden">
             <span className="material-symbols-outlined absolute right-2 bottom-2 text-4xl opacity-10 text-[#0891B2]">cake</span>
             <p className="text-3xl font-extrabold text-[#155E75] font-display mb-1">1</p>
             <p className="text-[10px] font-bold text-[#155E75] uppercase tracking-widest mb-1">Your Day</p>
             <p className="text-[9px] text-[#0891B2] font-medium italic">Day to celebrate</p>
           </div>
         </div>
      </div>

    </div>
  )
}
