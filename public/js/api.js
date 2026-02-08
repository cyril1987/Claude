const API = {
  _handleUnauthorized(res) {
    if (res.status === 401) {
      window.location.href = '/login.html';
      return true;
    }
    return false;
  },

  async get(path) {
    const res = await fetch(`/api${path}`);
    if (this._handleUnauthorized(res)) return;
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
    if (this._handleUnauthorized(res)) return;
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
    if (this._handleUnauthorized(res)) return;
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
    if (this._handleUnauthorized(res)) return;
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(data.error || res.statusText);
    }
    return null;
  },
};
