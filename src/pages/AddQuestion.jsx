import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'

export default function AddQuestion(){
  const [questionText,setQuestionText] = useState('')
  const [type,setType] = useState('multiple_choice')
  const [options,setOptions] = useState(['','','',''])
  const [correct,setCorrect] = useState('A')
  const nav = useNavigate()

  const userId = localStorage.getItem('userId')
  const toast = useToast()
  if(!userId){ nav('/login'); return null }

  const [questionList, setQuestionList] = useState([])
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  async function submit(e){
    e.preventDefault()
    const payload = { questionText, type, options: type==='multiple_choice'?options:['true','false'], correctAnswer: correct }
    try{
      const res = await fetch('/api/questions',{ method:'POST', headers:{'Content-Type':'application/json','x-user-id':userId}, body:JSON.stringify(payload) })
      if(res.ok){
        toast('Thêm câu hỏi thành công!', 'success')
        // refresh list and clear form
        loadQuestionList()
        setQuestionText('')
        setOptions(['','','',''])
        setCorrect('A')
      } else {
        const d = await res.json()
        toast(d.error || 'Có lỗi khi thêm câu hỏi', 'error')
      }
    }catch(err){ alert('Network error') }
  }

  async function loadQuestionList(){
    try{
      const res = await fetch('/api/questions', { headers: { 'x-user-id': userId } })
      if(!res.ok) throw new Error('Failed')
      const data = await res.json()
      setQuestionList(Array.isArray(data)?data:[])
    }catch(e){
      toast('Có lỗi khi tải danh sách câu hỏi', 'error')
    }
  }

  useEffect(()=>{ loadQuestionList() }, [])

  function openEdit(q){
    setEditingQuestion(q)
    // populate form fields in modal (we use separate state)
    setQuestionText(q.questionText || '')
    setType(q.type || 'multiple_choice')
    setOptions(q.options && q.options.length? q.options.slice(0,4) : ['','','',''])
    setCorrect(q.correctAnswer || (q.type==='multiple_choice'?'A':'true'))
    // show modal by manipulating class
    const modal = document.getElementById('edit-modal')
    if(modal) modal.classList.remove('hidden')
  }

  function handleTypeChange(newType){
    setType(newType)
    if(newType === 'multiple_choice'){
      // ensure we have 4 option slots when switching to MCQ
      if(options.length < 4){
        const padded = options.slice()
        while(padded.length < 4) padded.push('')
        setOptions(padded)
      }
      if(!['A','B','C','D'].includes(correct)) setCorrect('A')
    } else {
      // switch to true/false: ensure correct is 'true' or 'false'
      if(correct !== 'true' && correct !== 'false') setCorrect('true')
    }
  }

  function closeEditModal(){
    setEditingQuestion(null)
    const modal = document.getElementById('edit-modal')
    if(modal) modal.classList.add('hidden')
    // reset form values
    setQuestionText('')
    setType('multiple_choice')
    setOptions(['','','',''])
    setCorrect('A')
  }

  async function saveEditQuestion(){
    if(!editingQuestion) return
    setSavingEdit(true)
    const id = editingQuestion._id
    const payload = { questionText, type, options: type==='multiple_choice'?options:['true','false'], correctAnswer: correct }
    try{
      const res = await fetch(`/api/questions/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json', 'x-user-id': userId }, body: JSON.stringify(payload) })
      if(!res.ok) throw new Error('Failed')
      toast('Cập nhật câu hỏi thành công!', 'success')
      closeEditModal()
      loadQuestionList()
    }catch(e){ toast('Có lỗi khi cập nhật câu hỏi', 'error') }
    finally{ setSavingEdit(false) }
  }

  function confirmDelete(id){
    window.pendingDeleteId = id
    const dm = document.getElementById('delete-modal')
    if(dm) dm.classList.remove('hidden')
  }

  async function doDelete(){
    const id = window.pendingDeleteId
    if(!id) return
    try{
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE', headers: { 'x-user-id': userId } })
      if(!res.ok) throw new Error('Failed')
      toast('Đã xóa câu hỏi!', 'success')
      loadQuestionList()
    }catch(e){ toast('Có lỗi khi xóa câu hỏi', 'error') }
    const dm = document.getElementById('delete-modal')
    if(dm) dm.classList.add('hidden')
    window.pendingDeleteId = null
  }

  React.useEffect(() => {
    document.body.classList.add('add-question-body')
    return () => { document.body.classList.remove('add-question-body') }
  }, [])
  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form id="question-form" onSubmit={submit} className="space-y-4">
            <h3 className="text-2xl font-semibold text-gray-800">Thêm câu hỏi mới</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung câu hỏi</label>
              <textarea id="questionText" rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Nhập nội dung câu hỏi..." value={questionText} onChange={e=>setQuestionText(e.target.value)}></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại câu hỏi</label>
              <select id="questionType" value={type} onChange={e=>handleTypeChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="true_false">Đúng / Sai</option>
                <option value="multiple_choice">4 lựa chọn</option>
              </select>
            </div>

            {type==='true_false' ? (
              <div id="true-false-options">
                <label className="block text-sm font-medium text-gray-700 mb-1">Đáp án đúng</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2"><input type="radio" name="correctAnswerTF" value="true" onChange={()=>setCorrect('true')} /> Đúng</label>
                  <label className="flex items-center gap-2"><input type="radio" name="correctAnswerTF" value="false" onChange={()=>setCorrect('false')} /> Sai</label>
                </div>
              </div>
            ) : (
              <div id="mcq-options">
                {options.map((o,idx)=> (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{String.fromCharCode(65+idx)}</label>
                    <input className="w-full px-3 py-2 border rounded-lg" value={o} onChange={e=>{ const copy=[...options]; copy[idx]=e.target.value; setOptions(copy) }} />
                    <label className="flex items-center gap-2 mt-2"><input type="radio" name="correctAnswerMCQ" value={String.fromCharCode(65+idx)} onChange={()=>setCorrect(String.fromCharCode(65+idx))} /> Đáp án đúng</label>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button id="add-btn" type="submit" className="flex-1 btn-primary px-4 py-2 rounded-lg" style={{border:'none'}}>Thêm câu hỏi</button>
              <button type="button" onClick={()=>nav('/home')} className="flex-1 btn-cancel px-4 py-2 rounded-lg" style={{border:'none'}}>Hủy</button>
            </div>
          </form>

          <div className="lg:pl-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">Danh sách câu hỏi</h3>
              <div id="question-count" className="text-sm text-gray-600">0 câu</div>
            </div>
            <div id="question-list-container" className="max-h-[680px] min-w-[420px] lg:min-w-[480px] overflow-y-auto custom-scrollbar space-y-3">
              {questionList.length === 0 && (<div className="text-sm text-gray-600">Chưa có câu hỏi</div>)}
              {questionList.map((q) => (
                <div key={q._id} className="question-item bg-gray-50 p-4 rounded-lg mb-3 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 pr-4 text-gray-800 font-medium break-words">{q.questionText}</div>
                    <div className="text-xs text-gray-600"><span className="px-2 py-1 bg-gray-100 rounded-md">{q.type === 'true_false' ? 'Đúng / Sai' : '4 lựa chọn'}</span></div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={()=>openEdit(q)} className="edit-btn bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition">Sửa</button>
                    <button onClick={()=>confirmDelete(q._id)} className="delete-btn bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition">Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* edit modal and delete modal placeholders (UI only) */}
      <div id="edit-modal" className={`fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50`}> 
        <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md fade-in">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Sửa câu hỏi</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
            <input type="text" value={questionText} onChange={e=>setQuestionText(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-2" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
            <select value={type} onChange={e=>handleTypeChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
              <option value="true_false">Đúng / Sai</option>
              <option value="multiple_choice">4 lựa chọn</option>
            </select>
          </div>
          {type==='true_false' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đáp án đúng</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2"><input type="radio" name="editCorrectTF" value="true" checked={correct==='true'} onChange={()=>setCorrect('true')} /> Đúng</label>
                <label className="flex items-center gap-2"><input type="radio" name="editCorrectTF" value="false" checked={correct==='false'} onChange={()=>setCorrect('false')} /> Sai</label>
              </div>
            </div>
          ) : (
            <div>
              {options.map((o,idx)=> (
                <div key={idx} className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{String.fromCharCode(65+idx)}</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={o} onChange={e=>{ const copy=[...options]; copy[idx]=e.target.value; setOptions(copy) }} />
                  <label className="flex items-center gap-2 mt-2"><input type="radio" name="editCorrectMCQ" value={String.fromCharCode(65+idx)} checked={correct===String.fromCharCode(65+idx)} onChange={()=>setCorrect(String.fromCharCode(65+idx))} /> Đáp án đúng</label>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center gap-3 mt-4">
            <button onClick={saveEditQuestion} className="bg-green-500 text-white px-6 py-2 rounded-lg">Lưu</button>
            <button onClick={closeEditModal} className="bg-gray-500 text-white px-6 py-2 rounded-lg">Hủy</button>
          </div>
        </div>
      </div>

      <div id="delete-modal" className="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm fade-in">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">Xác nhận xóa</h3>
          <p className="text-sm text-gray-600 mb-4">Bạn có chắc muốn xóa câu hỏi này? Hành động này không thể hoàn tác.</p>
          <div className="flex justify-center gap-3">
            <button onClick={doDelete} className="bg-red-500 text-white px-6 py-2 rounded-lg">Xóa</button>
            <button onClick={()=>{ const dm=document.getElementById('delete-modal'); if(dm) dm.classList.add('hidden'); window.pendingDeleteId=null }} className="bg-gray-500 text-white px-6 py-2 rounded-lg">Hủy</button>
          </div>
        </div>
      </div>
    </div>
  )
}
