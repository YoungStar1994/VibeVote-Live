import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Admin from './Admin';
import React from 'react';

// Mock 全局 fetch
beforeEach(() => {
    global.fetch = vi.fn((url) => {
        if (url.includes('/api/settings')) {
            return Promise.resolve({
                json: () => Promise.resolve({ event_title: '测试活动' }),
            });
        }
        if (url.includes('/api/programs')) {
            return Promise.resolve({
                json: () => Promise.resolve([]),
            });
        }
        return Promise.reject(new Error('Unknown API'));
    });
});

describe('Admin Component Smoke Test', () => {
    it('应当渲染登录界面', async () => {
        render(<Admin />);
        expect(await screen.findByText(/管理后台登录/i)).toBeDefined();
    });

    it('应当包含用户名和密码输入框', async () => {
        render(<Admin />);
        expect(await screen.findByLabelText(/用户名/i)).toBeDefined();
        expect(await screen.findByLabelText(/密码/i)).toBeDefined();
    });
});
