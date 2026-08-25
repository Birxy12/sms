import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Radio, notification, Form, Select, Tag } from 'antd';
import { sendNotification } from '../../utils/notifications';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { Send, Mail, MessageSquare, Bell, Users, Trash2, CheckCircle, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { CLASS_LIST } from '../../utils/subjectConfig';

const { TextArea } = Input;
const { Option } = Select;

const NotificationCenter = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recentBroadcasts, setRecentBroadcasts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [targetAudience, setTargetAudience] = useState('global');

  const classes = CLASS_LIST;

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(15));
      const snap = await getDocs(q);
      setRecentBroadcasts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error loading notification history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await sendNotification({
        type: values.type || 'both',
        subject: values.subject,
        message: values.message,
        targetType: values.targetType || 'global',
        targetValue: values.targetType === 'class' ? values.targetClass : values.targetType === 'student' ? values.targetStudent : '',
      });

      if (response.success) {
        notification.success({
          message: 'Broadcast Published',
          description: `Message successfully stored in Firebase and delivered to ${values.targetType === 'global' ? 'all students' : values.targetType === 'class' ? values.targetClass : 'student inbox'}.`,
        });
        form.resetFields();
        form.setFieldsValue({ type: 'both', targetType: 'global' });
        setTargetAudience('global');
        fetchHistory();
      } else {
        notification.error({
          message: 'Broadcast Failed',
          description: response.error || 'Failed to publish message.',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBroadcast = async (id) => {
    if (!window.confirm('Delete this broadcast notification from the system?')) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
      setRecentBroadcasts(prev => prev.filter(n => n.id !== id));
      notification.success({ message: 'Broadcast deleted.' });
    } catch (err) {
      console.error(err);
      notification.error({ message: 'Failed to delete broadcast.' });
    }
  };

  return (
    <div className="page-content animate-in space-y-8 max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <Bell size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 m-0">Notification Center</h1>
            <p className="text-slate-500 m-0 mt-0.5 text-sm">
              Broadcast announcements, class alerts, and student inbox notices via Firebase
            </p>
          </div>
        </div>

        <button 
          onClick={fetchHistory} 
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
        >
          <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} /> Refresh Log
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Broadcast Form */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
            <h3 className="text-lg font-black text-slate-800 mb-1">Create New Broadcast</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
              Messages are delivered in real-time to student inboxes & dashboard notifications
            </p>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ type: 'both', targetType: 'global' }}
            >
              {/* Target Audience */}
              <Form.Item
                name="targetType"
                label={<span className="text-xs font-black text-slate-600 uppercase tracking-wider">Target Audience</span>}
                rules={[{ required: true }]}
              >
                <Select 
                  size="large" 
                  onChange={(val) => setTargetAudience(val)}
                  className="w-full font-bold"
                >
                  <Option value="global">📢 All Students & Parents (Global Broadcast)</Option>
                  <Option value="class">🏫 Specific Class (e.g. JSS1, SS2, Basic 1)</Option>
                  <Option value="student">👤 Individual Student (By Registration Number)</Option>
                </Select>
              </Form.Item>

              {/* Dynamic Target Input */}
              {targetAudience === 'class' && (
                <Form.Item
                  name="targetClass"
                  label={<span className="text-xs font-black text-slate-600 uppercase tracking-wider">Select Target Class</span>}
                  rules={[{ required: true, message: 'Please pick a class' }]}
                >
                  <Select size="large" placeholder="Select Class" className="w-full font-bold">
                    {classes.map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
                </Form.Item>
              )}

              {targetAudience === 'student' && (
                <Form.Item
                  name="targetStudent"
                  label={<span className="text-xs font-black text-slate-600 uppercase tracking-wider">Student Registration Number</span>}
                  rules={[{ required: true, message: 'Enter student registration number (e.g. BDS/24/001)' }]}
                >
                  <Input size="large" placeholder="e.g. BDS/24/001 or BDS/B1/2026/001" className="font-bold" />
                </Form.Item>
              )}

              {/* Notification Channel */}
              <Form.Item
                name="type"
                label={<span className="text-xs font-black text-slate-600 uppercase tracking-wider">Delivery Channels</span>}
                rules={[{ required: true }]}
              >
                <Radio.Group className="w-full">
                  <div className="grid grid-cols-3 gap-3">
                    <Radio.Button value="in-app" className="h-auto py-2.5 text-center rounded-xl font-bold text-xs">
                      <div className="flex flex-col items-center gap-1.5">
                        <Bell size={16} />
                        <span>In-App Inbox</span>
                      </div>
                    </Radio.Button>
                    <Radio.Button value="email" className="h-auto py-2.5 text-center rounded-xl font-bold text-xs">
                      <div className="flex flex-col items-center gap-1.5">
                        <Mail size={16} />
                        <span>Email Alert</span>
                      </div>
                    </Radio.Button>
                    <Radio.Button value="both" className="h-auto py-2.5 text-center rounded-xl font-bold text-xs">
                      <div className="flex flex-col items-center gap-1.5">
                        <Send size={16} />
                        <span>All Channels</span>
                      </div>
                    </Radio.Button>
                  </div>
                </Radio.Group>
              </Form.Item>

              {/* Title / Subject */}
              <Form.Item
                name="subject"
                label={<span className="text-xs font-black text-slate-600 uppercase tracking-wider">Announcement Title *</span>}
                rules={[{ required: true, message: 'Please enter notification title' }]}
              >
                <Input size="large" placeholder="e.g. Mid-Term Assessment Schedule & Guidelines" className="font-bold rounded-xl" />
              </Form.Item>

              {/* Message Body */}
              <Form.Item
                name="message"
                label={<span className="text-xs font-black text-slate-600 uppercase tracking-wider">Message Content *</span>}
                rules={[{ required: true, message: 'Please enter the message body' }]}
              >
                <TextArea 
                  rows={5} 
                  className="rounded-2xl font-medium text-slate-800"
                  placeholder="Type full notification details here..."
                />
              </Form.Item>

              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-white shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 mt-2"
                loading={loading}
              >
                <Send size={18} /> Broadcast Notification via Firebase
              </Button>
            </Form>
          </div>
        </div>

        {/* Broadcast History Log */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 m-0">Recent Broadcasts</h3>
                <p className="text-xs text-slate-400 m-0">Live messages in Firebase</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {recentBroadcasts.length} total
              </span>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-slate-400 text-sm font-bold">
                Loading broadcast history...
              </div>
            ) : recentBroadcasts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-100 rounded-2xl">
                No notifications sent yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {recentBroadcasts.map((n) => (
                  <div key={n.id} className="p-4 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl border border-slate-100 transition-all text-left group">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {n.targetType === 'global' ? 'Global' : n.targetType === 'class' ? `Class: ${n.targetValue}` : `Student: ${n.targetValue}`}
                      </span>
                      <button 
                        onClick={() => handleDeleteBroadcast(n.id)}
                        className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                        title="Delete Broadcast"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 mb-1 leading-snug">
                      {n.title || n.subject}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed mb-2">
                      {n.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-200/60">
                      <span>{n.type || 'both'}</span>
                      <span>
                        {n.timestamp ? new Date(n.timestamp).toLocaleDateString() : n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
