import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Profile(){
  const userId = localStorage.getItem('userId')
  const [profile,setProfile] = useState(null)
  const [displayName,setDisplayName] = useState('')
  const avatarRef = useRef(null)
  const nav = useNavigate()

  useEffect(()=>{
    if(!userId) { nav('/login'); return }
    fetch(`/api/profile/${userId}`).then(r=>r.json()).then(p=>{ setProfile(p); setDisplayName(p.displayName||'') }).catch(()=>{})
  },[])

  React.useEffect(() => {
    document.body.classList.add('profile-body')
    return () => { document.body.classList.remove('profile-body') }
  }, [])

  async function save(){
    try{
      const form = new FormData()
      form.append('displayName', displayName)
      const fileInput = avatarRef.current
      if(fileInput && fileInput.files && fileInput.files.length>0){
        form.append('avatar', fileInput.files[0])
      }
      const res = await fetch(`/api/profile/${userId}`, { method: 'PUT', body: form })
      if(res.ok){
        alert('Cập nhật thành công')
        nav('/home')
      } else { alert('Lỗi khi cập nhật'); }
    }catch(e){ alert('Lỗi mạng') }
  }

  function cancel(){ nav('/home') }

  if(!profile) return <div className="page">Loading...</div>
  return (
    <div>
      <div className="profile-container">
        <h3>Chỉnh sửa hồ sơ</h3>
        <img id="avatar-preview" src={profile.avatar||'/default-avatar.png'} alt="Avatar" />
        <input ref={avatarRef} id="avatar-input" type="file" accept="image/*" />
        <input id="display-name" type="text" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
        <p><strong>Điểm cao nhất:</strong> <span id="high-score">{profile.highScore||0}</span></p>
        <div className="button-group">
          <button className="save-btn" onClick={save}>Lưu</button>
          <button className="cancel-btn" onClick={cancel}>Hủy</button>
        </div>
      </div>
    </div>
  )
}
