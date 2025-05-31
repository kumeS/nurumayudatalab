      case 'multiselect':
        fieldInput = `
          <div class="behavior-tags-container" id="input_${field.id}">
            ${field.options.map((option, index) => `
              <label class="behavior-tag-item">
                <input type="checkbox" name="${field.id}" value="${option}" class="behavior-tag-checkbox">
                <span class="behavior-tag-label">${option}</span>
              </label>
            `).join('')}
          </div>
        `;
        break;