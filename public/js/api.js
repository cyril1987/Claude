const API = {
  _user: null,

  async currentUser() {
    if (this._user) return this._user;
    const res = await fetch('/auth/me');
    if (!res.ok) return null;
    this._user = await res.json();
    return this._user;
  },

  clearUser() {
    this._user = null;
  },

  async logout() {
    await fetch('/auth/logout', { method: 'POST' });
    this._user = null;
    window.location.hash = '#/login';
  },

  _check401(res) {
    if (res.status === 401) {
      this._user = null;
      window.location.hash = '#/login';
      throw new Error('Authentication required');
    }
  },

  async get(path) {
    const res = await fetch(`/api${path}`);
    this._check401(res);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || body.errors?.join(', ') || res.statusText);
    }
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    this._check401(res);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      const err = new Error(data.error || data.errors?.join(', ') || res.statusText);
      err.data = data;
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  },

  async put(path, body) {
    const res = await fetch(`/api${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    this._check401(res);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      const err = new Error(data.error || data.errors?.join(', ') || res.statusText);
      err.data = data;
      throw err;
    }
    return res.json();
  },

  async delete(path) {
    const res = await fetch(`/api${path}`, { method: 'DELETE' });
    this._check401(res);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(data.error || res.statusText);
    }
    return null;
  },
};
