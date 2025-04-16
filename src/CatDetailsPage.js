// 在records.map处理部分添加显示文件链接的代码
{records.map((record) => (
  <div key={record.id} className="list-group-item">
    <div className="d-flex justify-content-between align-items-start">
      <div>
        <div className="mb-1">
          <span className={`record-badge record-badge-${record.type.toLowerCase()}`}>
            {record.type}
          </span>
        </div>
        <p className="mb-1">
          <small className="text-muted">
            <i className="bi bi-calendar3 me-1"></i>
            {new Date(record.date).toLocaleDateString()}
          </small>
        </p>
        <p className="mb-1">
          {record.description && (
            expandedRecords[record.id]
              ? record.description
              : truncate(record.description, 100)
          )}
          {record.description && record.description.length > 100 && (
            <button
              className="btn btn-link p-0 ms-2"
              onClick={() => toggleExpand(record.id)}
            >
              {expandedRecords[record.id] ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>
        {record.notes && (
          <p className="mb-1">
            <small className="text-muted">
              <i className="bi bi-journal-text me-1"></i>
              Notes: {record.notes}
            </small>
          </p>
        )}
        {record.fileUrl && (
          <p className="mb-1">
            <a 
              href={record.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-sm btn-outline-info mt-2"
            >
              <i className="bi bi-file-earmark me-1"></i>
              View Attachment
            </a>
          </p>
        )}
      </div>
      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() => handleEditRecord(record.id)}
      >
        <i className="bi bi-pencil me-1"></i>
        Edit
      </button>
    </div>
  </div>
))}