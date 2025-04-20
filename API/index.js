<div className="mb-3">
  <label htmlFor="repeatType" className="form-label">Repeat</label>
  <select
    className="form-select"
    id="repeatType"
    name="repeatType"
    value={formData.repeatType}
    onChange={handleChange}
  >
    <option value="none">Never</option>
    <option value="daily">Daily</option>
    <option value="weekly">Weekly</option>
    <option value="monthly">Monthly</option>
    <option value="yearly">Yearly</option>
  </select>
</div>

{formData.repeatType !== 'none' && (
  <>
    <div className="mb-3">
      <label htmlFor="repeatInterval" className="form-label">Repeat Every</label>
      <div className="input-group">
        <input
          type="number"
          className="form-control"
          id="repeatInterval"
          name="repeatInterval"
          value={formData.repeatInterval}
          onChange={handleChange}
          min="1"
        />
        <span className="input-group-text">
          {formData.repeatType === 'daily' ? 'days' : 
           formData.repeatType === 'weekly' ? 'weeks' : 
           formData.repeatType === 'monthly' ? 'months' : 'years'}
        </span>
      </div>
    </div>
    <div className="mb-3">
      <label htmlFor="endDate" className="form-label">End Date (Optional)</label>
      <input
        type="date"
        className="form-control"
        id="endDate"
        name="endDate"
        value={formData.endDate}
        onChange={handleChange}
      />
    </div>
  </>
)}