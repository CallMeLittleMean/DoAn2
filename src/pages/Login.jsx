import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [error,setError] = useState('')
  const [showRegister,setShowRegister] = useState(false)
  const nav = useNavigate()

  React.useEffect(() => {
    // apply page-specific body class so original CSS applies
    document.body.classList.add('login-body')
    return () => { document.body.classList.remove('login-body') }
  }, [])

  async function submit(e){
    e.preventDefault()
    setError('')
    try{
      const res = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})})
      const data = await res.json()
      if(res.ok){
        localStorage.setItem('userId', data.userId)
        nav('/home')
      } else {
        setError(data.error || 'Login failed')
      }
    }catch(err){
      setError('Network error')
    }
  }

  return (
    <div>
      <div className="login-container">
        <h2>Đăng nhập</h2>
        <div id="error-msg" className="error">{error}</div>
        <input id="username" type="text" placeholder="Tên đăng nhập" value={username} onChange={e=>setUsername(e.target.value)} />
        <input id="password" type="password" placeholder="Mật khẩu" value={password} onChange={e=>setPassword(e.target.value)} />
        <div className="login-actions">
          <button className="primary" onClick={submit}>Đăng nhập</button>
          <button className="secondary" onClick={()=>setShowRegister(true)}>Đăng ký</button>
        </div>
      </div>

      {/* Register modal (UI only) */}
      {showRegister && (
        <div id="register-modal" style={{display:'flex',position:'fixed',inset:0,alignItems:'center',justifyContent:'center',zIndex:10000}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)'}}></div>
          <div style={{position:'relative',background:'white',padding:20,borderRadius:10,width:320,zIndex:10001}}>
            <h3 style={{marginTop:0}}>Đăng ký tài khoản</h3>
            <div id="reg-error" className="error" style={{textAlign:'left'}}></div>
            <label style={{display:'block',textAlign:'left',fontWeight:600,marginTop:6}}>Tên đăng nhập</label>
            <input id="reg-username" type="text" placeholder="Tên đăng nhập" />
            <label style={{display:'block',textAlign:'left',fontWeight:600,marginTop:6}}>Mật khẩu</label>
            <input id="reg-password" type="password" placeholder="Mật khẩu" />
            <label style={{display:'block',textAlign:'left',fontWeight:600,marginTop:6}}>Xác nhận mật khẩu</label>
            <div id="reg-confirm-error" style={{color:'red',fontSize:13,marginBottom:6,display:'none'}}></div>
            <input id="reg-password2" type="password" placeholder="Xác nhận mật khẩu" />
            <div style={{marginTop:10}}>
              <button id="reg-submit" disabled style={{background:'#9ca3af'}}>Đăng ký</button>
              <button onClick={()=>setShowRegister(false)} style={{marginLeft:8,background:'#ef4444'}}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      <div id="toast-container" style={{position:'fixed',top:20,right:20,zIndex:9999}}></div>
    </div>
  )
}
