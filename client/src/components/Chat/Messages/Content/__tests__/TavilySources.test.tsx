import React from 'react';
import { render, screen } from '@testing-library/react';
import TavilySources from '../TavilySources';

// Mock dependencies
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string, values?: any) => {
    const translations: Record<string, string> = {
      com_ui_result: 'Result',
      com_ui_untitled: 'Untitled',
      com_sources_title: 'Sources',
      com_sources_tab_images: 'Images',
      com_ui_examples: 'Examples',
    };
    return translations[key] || key;
  },
}));

jest.mock('lucide-react', () => ({
  ExternalLink: () => <span data-testid="external-link-icon">ExternalLink</span>,
}));

describe('TavilySources', () => {
  const mockShowFallback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JSON Parsing', () => {
    it('should parse standard Tavily JSON response', () => {
      const output = JSON.stringify({
        query: 'test query',
        answer: 'Test answer',
        results: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            content: 'Test content',
            score: 0.95,
          },
        ],
      });

      render(<TavilySources output={output} showFallback={mockShowFallback} />);

      expect(screen.getByText('Test answer')).toBeInTheDocument();
      expect(screen.getByText('Test Result')).toBeInTheDocument();
      expect(mockShowFallback).toHaveBeenCalledWith(false);
    });

    it('should parse MCP response format with nested JSON', () => {
      const tavilyResponse = {
        results: [
          {
            title: 'MCP Result',
            url: 'https://mcp-test.com',
            content: 'MCP content',
          },
        ],
      };

      const mcpOutput = JSON.stringify([
        {
          type: 'text',
          text: JSON.stringify(tavilyResponse),
        },
      ]);

      render(<TavilySources output={mcpOutput} showFallback={mockShowFallback} />);

      expect(screen.getByText('MCP Result')).toBeInTheDocument();
      expect(screen.getByText('MCP content')).toBeInTheDocument();
      expect(mockShowFallback).toHaveBeenCalledWith(false);
    });

    it('should return null and trigger fallback for invalid JSON', () => {
      const { container } = render(
        <TavilySources output="invalid json" showFallback={mockShowFallback} />,
      );

      expect(container.firstChild).toBeNull();
      expect(mockShowFallback).toHaveBeenCalledWith(true);
    });

    it('should return null and trigger fallback when results array is empty', () => {
      const output = JSON.stringify({
        query: 'test',
        results: [],
      });

      const { container } = render(
        <TavilySources output={output} showFallback={mockShowFallback} />,
      );

      expect(container.firstChild).toBeNull();
      expect(mockShowFallback).toHaveBeenCalledWith(true);
    });

    it('should return null and trigger fallback when results field is missing', () => {
      const output = JSON.stringify({
        query: 'test',
        answer: 'Some answer',
      });

      const { container } = render(
        <TavilySources output={output} showFallback={mockShowFallback} />,
      );

      expect(container.firstChild).toBeNull();
      expect(mockShowFallback).toHaveBeenCalledWith(true);
    });
  });

  describe('Answer Section Rendering', () => {
    it('should render answer section when answer is provided', () => {
      const output = JSON.stringify({
        answer: 'This is the answer',
        results: [{ url: 'https://example.com' }],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('Result')).toBeInTheDocument();
      expect(screen.getByText('This is the answer')).toBeInTheDocument();
    });

    it('should not render answer section when answer is missing', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
      });

      render(<TavilySources output={output} />);

      expect(screen.queryByText('Result')).not.toBeInTheDocument();
    });
  });

  describe('Sources Section Rendering', () => {
    it('should render multiple search results with correct count', () => {
      const output = JSON.stringify({
        results: [
          { title: 'Result 1', url: 'https://example1.com', content: 'Content 1' },
          { title: 'Result 2', url: 'https://example2.com', content: 'Content 2' },
          { title: 'Result 3', url: 'https://example3.com', content: 'Content 3' },
        ],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('Sources (3)')).toBeInTheDocument();
      expect(screen.getByText('Result 1')).toBeInTheDocument();
      expect(screen.getByText('Result 2')).toBeInTheDocument();
      expect(screen.getByText('Result 3')).toBeInTheDocument();
    });

    it('should render clickable links with correct href and attributes', () => {
      const output = JSON.stringify({
        results: [{ title: 'Clickable Result', url: 'https://test.example.com/page' }],
      });

      render(<TavilySources output={output} />);

      const link = screen.getByRole('link', { name: /Clickable Result/i });
      expect(link).toHaveAttribute('href', 'https://test.example.com/page');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should display hostname extracted from URL', () => {
      const output = JSON.stringify({
        results: [{ title: 'Test', url: 'https://subdomain.example.com/path/to/page?query=1' }],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('subdomain.example.com')).toBeInTheDocument();
    });

    it('should display full URL when hostname extraction fails', () => {
      const output = JSON.stringify({
        results: [{ title: 'Test', url: 'invalid-url' }],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('invalid-url')).toBeInTheDocument();
    });

    it('should render "Untitled" when title is missing', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('should render content snippet when available', () => {
      const output = JSON.stringify({
        results: [
          {
            title: 'Test',
            url: 'https://example.com',
            content: 'This is a content snippet',
          },
        ],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('This is a content snippet')).toBeInTheDocument();
    });

    it('should not render content snippet when missing', () => {
      const output = JSON.stringify({
        results: [{ title: 'Test', url: 'https://example.com' }],
      });

      const { container } = render(<TavilySources output={output} />);

      // Should not have paragraph with content class
      const contentParagraph = container.querySelector('p.line-clamp-2');
      expect(contentParagraph).not.toBeInTheDocument();
    });

    it('should render score badge when score is provided', () => {
      const output = JSON.stringify({
        results: [{ title: 'Test', url: 'https://example.com', score: 0.8567 }],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('86%')).toBeInTheDocument();
    });

    it('should not render score badge when score is missing', () => {
      const output = JSON.stringify({
        results: [{ title: 'Test', url: 'https://example.com' }],
      });

      const { container } = render(<TavilySources output={output} />);

      // Should not have score span
      const scoreBadge = container.querySelector('span.inline-flex');
      expect(scoreBadge).not.toBeInTheDocument();
    });

    it('should render ExternalLink icon for each result', () => {
      const output = JSON.stringify({
        results: [
          { title: 'Result 1', url: 'https://example1.com' },
          { title: 'Result 2', url: 'https://example2.com' },
        ],
      });

      render(<TavilySources output={output} />);

      const icons = screen.getAllByTestId('external-link-icon');
      expect(icons).toHaveLength(2);
    });
  });

  describe('Images Section Rendering', () => {
    it('should render images section with correct count', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
        images: [
          { url: 'https://img1.com/pic1.jpg', description: 'Image 1' },
          { url: 'https://img2.com/pic2.jpg', description: 'Image 2' },
        ],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('Images (2)')).toBeInTheDocument();
    });

    it('should limit images to maximum of 6', () => {
      const images = Array.from({ length: 10 }, (_, i) => ({
        url: `https://img${i}.com/pic${i}.jpg`,
      }));

      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
        images,
      });

      render(<TavilySources output={output} />);

      // Should show "Images (10)" but only render 6 img tags
      expect(screen.getByText('Images (10)')).toBeInTheDocument();
      const imgElements = screen.getAllByRole('img');
      expect(imgElements).toHaveLength(6);
    });

    it('should render image with description overlay', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
        images: [{ url: 'https://img.com/pic.jpg', description: 'Beautiful sunset' }],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('Beautiful sunset')).toBeInTheDocument();
      expect(screen.getByAltText('Beautiful sunset')).toBeInTheDocument();
    });

    it('should render image without description overlay when missing', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
        images: [{ url: 'https://img.com/pic.jpg' }],
      });

      const { container } = render(<TavilySources output={output} />);

      // Should have img but no description overlay
      expect(screen.getByRole('img')).toBeInTheDocument();
      const overlay = container.querySelector('.absolute.inset-x-0.bottom-0');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should use fallback alt text when description is missing', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
        images: [{ url: 'https://img.com/pic.jpg' }],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByAltText('Images 1')).toBeInTheDocument();
    });

    it('should not render images section when images array is empty', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
        images: [],
      });

      render(<TavilySources output={output} />);

      expect(screen.queryByText(/Images/i)).not.toBeInTheDocument();
    });

    it('should not render images section when images field is missing', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
      });

      render(<TavilySources output={output} />);

      expect(screen.queryByText(/Images/i)).not.toBeInTheDocument();
    });

    it('should render image links with correct attributes', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
        images: [{ url: 'https://img.com/pic.jpg' }],
      });

      const { container } = render(<TavilySources output={output} />);

      const imageLink = container.querySelector('a[href="https://img.com/pic.jpg"]');
      expect(imageLink).toBeInTheDocument();
      expect(imageLink).toHaveAttribute('target', '_blank');
      expect(imageLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Follow-up Questions Rendering', () => {
    it('should render follow-up questions section', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
        follow_up_questions: ['Question 1?', 'Question 2?', 'Question 3?'],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('Examples')).toBeInTheDocument();
      expect(screen.getByText('Question 1?')).toBeInTheDocument();
      expect(screen.getByText('Question 2?')).toBeInTheDocument();
      expect(screen.getByText('Question 3?')).toBeInTheDocument();
    });

    it('should not render follow-up questions when array is empty', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
        follow_up_questions: [],
      });

      render(<TavilySources output={output} />);

      expect(screen.queryByText('Examples')).not.toBeInTheDocument();
    });

    it('should not render follow-up questions when field is missing', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
      });

      render(<TavilySources output={output} />);

      expect(screen.queryByText('Examples')).not.toBeInTheDocument();
    });
  });

  describe('Complete Response Rendering', () => {
    it('should render all sections when complete Tavily response is provided', () => {
      const output = JSON.stringify({
        query: 'test query',
        answer: 'Complete answer',
        results: [
          {
            title: 'Complete Result',
            url: 'https://example.com',
            content: 'Complete content',
            score: 0.95,
          },
        ],
        images: [{ url: 'https://img.com/pic.jpg', description: 'Test image' }],
        follow_up_questions: ['Follow-up question?'],
        response_time: 1.23,
      });

      render(<TavilySources output={output} />);

      // Check all sections are rendered
      expect(screen.getByText('Complete answer')).toBeInTheDocument();
      expect(screen.getByText('Complete Result')).toBeInTheDocument();
      expect(screen.getByText('Images (1)')).toBeInTheDocument();
      expect(screen.getByText('Examples')).toBeInTheDocument();
      expect(screen.getByText('Follow-up question?')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle showFallback being undefined', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
      });

      // Should not throw error
      expect(() => render(<TavilySources output={output} />)).not.toThrow();
    });

    it('should handle result with all optional fields missing', () => {
      const output = JSON.stringify({
        results: [{ url: 'https://example.com' }],
      });

      const { container } = render(<TavilySources output={output} />);

      expect(screen.getByText('Untitled')).toBeInTheDocument();
      expect(container.querySelector('a[href="https://example.com"]')).toBeInTheDocument();
    });

    it('should handle score of 0', () => {
      const output = JSON.stringify({
        results: [{ title: 'Test', url: 'https://example.com', score: 0 }],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle score of 1', () => {
      const output = JSON.stringify({
        results: [{ title: 'Test', url: 'https://example.com', score: 1.0 }],
      });

      render(<TavilySources output={output} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });
});
