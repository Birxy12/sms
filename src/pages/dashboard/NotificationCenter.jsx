import React, { useState } from 'react';
import { Card, Input, Button, Radio, notification, Form } from 'antd';
import { sendNotification } from '../../utils/notifications';
import { Send, Mail, MessageSquare } from 'lucide-react';

const { TextArea } = Input;

const NotificationCenter = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    
    // In a real scenario, you'd fetch the actual students from your database.
    // For demonstration, we'll send it to a test recipient, or you'd pass the list of all students.
    const recipients = [
      // Example placeholders
      { email: 'student1@example.com', phone: '+1234567890' },
    ];

    try {
      const response = await sendNotification({
        type: values.type,
        subject: values.subject,
        message: values.message,
        recipients, // Pass the fetched list of students here
      });

      if (response.success) {
        notification.success({
          message: 'Notifications Sent',
          description: `Successfully sent ${response.results.emailsSent} emails and ${response.results.smsSent} SMS.`,
        });
        form.resetFields();
      } else {
        notification.error({
          message: 'Failed to Send Notifications',
          description: response.error || 'Check the server logs for details.',
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

  return (
    <div className="page-content animate-in">
      <div className="flex items-center gap-4 mb-6">
        <div className="stat-icon bg-primary-light text-primary">
          <Send size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 m-0">Notification Center</h1>
          <p className="text-slate-500 m-0">Broadcast messages to students via Email and SMS</p>
        </div>
      </div>

      <Card className="card-white max-w-2xl">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ type: 'both' }}
        >
          <Form.Item
            name="type"
            label="Notification Method"
            rules={[{ required: true }]}
          >
            <Radio.Group className="w-full">
              <div className="grid grid-cols-3 gap-4">
                <Radio.Button value="email" className="h-auto py-3 text-center rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <Mail size={20} />
                    <span>Email Only</span>
                  </div>
                </Radio.Button>
                <Radio.Button value="sms" className="h-auto py-3 text-center rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <MessageSquare size={20} />
                    <span>SMS Only</span>
                  </div>
                </Radio.Button>
                <Radio.Button value="both" className="h-auto py-3 text-center rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <Send size={20} />
                    <span>Both Email & SMS</span>
                  </div>
                </Radio.Button>
              </div>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return (type === 'email' || type === 'both') ? (
                <Form.Item
                  name="subject"
                  label="Email Subject"
                  rules={[{ required: true, message: 'Please enter a subject' }]}
                >
                  <Input size="large" className="input-premium" placeholder="e.g. School Resumption Notice" />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          <Form.Item
            name="message"
            label="Message Body"
            rules={[{ required: true, message: 'Please enter the message body' }]}
          >
            <TextArea 
              rows={6} 
              className="input-premium"
              placeholder="Type your message here... Note that SMS messages should be concise."
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              className="btn-glow w-full mt-4"
              loading={loading}
              icon={<Send size={18} />}
            >
              Broadcast Message
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default NotificationCenter;
